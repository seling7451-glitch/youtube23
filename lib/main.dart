import 'dart:async';

import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await JustAudioBackground.init(
    androidNotificationChannelId: 'com.personal.youtube_audio.playback',
    androidNotificationChannelName: 'Audio playback',
    androidNotificationChannelDescription: 'YouTube audio playback controls',
    androidNotificationOngoing: true,
  );
  runApp(const YouTubeAudioApp());
}

class YouTubeAudioApp extends StatelessWidget {
  const YouTubeAudioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'YouTube Audio',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.red),
        useMaterial3: true,
      ),
      home: const PlayerPage(),
    );
  }
}

class _Track {
  const _Track({
    required this.id,
    required this.title,
    required this.author,
    required this.thumbnail,
    required this.streamUrl,
  });

  final String id;
  final String title;
  final String author;
  final Uri thumbnail;
  final Uri streamUrl;
}

class PlayerPage extends StatefulWidget {
  const PlayerPage({super.key});

  @override
  State<PlayerPage> createState() => _PlayerPageState();
}

class _PlayerPageState extends State<PlayerPage> {
  final TextEditingController _urlController = TextEditingController();
  final AudioPlayer _player = AudioPlayer();
  final YoutubeExplode _youtube = YoutubeExplode();
  final List<String> _queue = <String>[];

  StreamSubscription<ProcessingState>? _processingSubscription;
  StreamSubscription<PlayerException>? _errorSubscription;
  String _status = 'YouTube havolasini yoki video ID sini kiriting.';
  _Track? _currentTrack;
  bool _isLoading = false;
  bool _isAdvancingQueue = false;

  @override
  void initState() {
    super.initState();
    unawaited(_requestNotificationPermission());
    _processingSubscription = _player.processingStateStream.listen((state) {
      if (state == ProcessingState.completed && !_isLoading) {
        unawaited(_playNextInQueue());
      }
    });
    _errorSubscription = _player.errorStream.listen((error) {
      if (mounted) {
        setState(() {
          _status = 'Ijro xatosi: ${error.message}';
        });
      }
    });
  }

  Future<void> _requestNotificationPermission() async {
    try {
      final status = await Permission.notification.request();
      if (!status.isGranted && mounted) {
        setState(() {
          _status =
              'Bildirishnoma ruxsati berilmadi. Fon ijrosi ishlashi mumkin, '
              'ammo boshqaruv bildirishnomasi ko\'rinmasligi mumkin.';
        });
      }
    } on Exception catch (error) {
      if (mounted) {
        setState(() {
          _status = 'Bildirishnoma ruxsatini so\'rashda xato: $error';
        });
      }
    }
  }

  @override
  void dispose() {
    _urlController.dispose();
    unawaited(_processingSubscription?.cancel());
    unawaited(_errorSubscription?.cancel());
    unawaited(_player.dispose());
    _youtube.close();
    super.dispose();
  }

  String? _extractVideoId(String input) {
    final value = input.trim();
    final idPattern = RegExp(r'^[A-Za-z0-9_-]{11}$');
    if (idPattern.hasMatch(value)) {
      return value;
    }

    final uri = Uri.tryParse(
      value.contains('://') ? value : 'https://$value',
    );
    if (uri == null) {
      return null;
    }

    final host = uri.host.toLowerCase();
    final isShortLink = host == 'youtu.be';
    final isYouTubeHost =
        host == 'youtube.com' || host.endsWith('.youtube.com');
    if (!isShortLink && !isYouTubeHost) {
      return null;
    }

    String? candidate;
    if (isShortLink) {
      candidate = uri.pathSegments.isEmpty ? null : uri.pathSegments.first;
    } else if (uri.pathSegments.isNotEmpty &&
        const <String>{'shorts', 'embed', 'live'}.contains(
          uri.pathSegments.first,
        )) {
      candidate = uri.pathSegments.length > 1 ? uri.pathSegments[1] : null;
    } else {
      candidate = uri.queryParameters['v'];
    }
    return candidate != null && idPattern.hasMatch(candidate)
        ? candidate
        : null;
  }

  Future<_Track> _fetchTrack(String videoId) async {
    final video = await _youtube.videos.get(videoId);
    final manifest = await _youtube.videos.streams.getManifest(videoId);
    final audioStreams = manifest.audioOnly;
    if (audioStreams.isEmpty) {
      throw FormatException('Bu videoda audio-only oqim topilmadi.');
    }
    final stream = audioStreams.reduce(
      (best, current) =>
          current.bitrate.compareTo(best.bitrate) > 0 ? current : best,
    );
    return _Track(
      id: video.id.value,
      title: video.title,
      author: video.author,
      thumbnail: Uri.parse(video.thumbnails.highResUrl),
      streamUrl: stream.url,
    );
  }

  Future<bool> _loadAndPlay(String videoId) async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _status = 'Video ma\'lumotlari va audio oqimi olinmoqda...';
      });
    }
    try {
      final track = await _fetchTrack(videoId);
      await _player.setAudioSource(
        AudioSource.uri(
          track.streamUrl,
          tag: MediaItem(
            id: track.id,
            title: track.title,
            artist: track.author,
            artUri: track.thumbnail,
          ),
        ),
      );
      if (!mounted) {
        return false;
      }
      setState(() {
        _currentTrack = track;
        _status = 'Ijro etilmoqda: ${track.title}';
      });
      unawaited(_startPlayback());
      return true;
    } on Exception catch (error) {
      if (mounted) {
        setState(() {
          _status = 'Ijro boshlanmadi: ${_describeError(error)}';
        });
      }
      return false;
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  String _describeError(Object error) {
    if (error is FormatException) {
      return error.message.toString();
    }
    return 'Tarmoq yoki YouTube xatosi. Internetni tekshirib, qayta urinib '
        'ko\'ring. ($error)';
  }

  Future<void> _startPlayback() async {
    try {
      await _player.play();
    } on Exception catch (error) {
      if (mounted) {
        setState(() {
          _status = 'Ijroda xato: ${_describeError(error)}';
        });
      }
    }
  }

  Future<void> _playInput() async {
    final videoId = _extractVideoId(_urlController.text);
    if (videoId == null) {
      setState(() {
        _status =
            'Noto\'g\'ri havola yoki video ID. YouTube URL yoki 11 belgili ID '
            'kiriting.';
      });
      return;
    }
    await _loadAndPlay(videoId);
  }

  Future<void> _addToQueue() async {
    final videoId = _extractVideoId(_urlController.text);
    if (videoId == null) {
      setState(() {
        _status =
            'Navbatga qo\'shish uchun yaroqli YouTube URL yoki video ID kiriting.';
      });
      return;
    }
    setState(() {
      _queue.add(videoId);
      _status = 'Navbatga qo\'shildi. Navbatda: ${_queue.length} ta video.';
    });
    if (_currentTrack == null ||
        _player.processingState == ProcessingState.completed) {
      await _playNextInQueue();
    }
  }

  Future<void> _playNextInQueue() async {
    if (_isAdvancingQueue || _isLoading) {
      return;
    }
    var didFail = false;
    _isAdvancingQueue = true;
    try {
      while (_queue.isNotEmpty && mounted) {
        final nextId = _queue.removeAt(0);
        final started = await _loadAndPlay(nextId);
        if (started) {
          return;
        }
        didFail = true;
      }
      if (mounted && !didFail && _queue.isEmpty && _currentTrack != null) {
        setState(() {
          _status = 'Ijro tugadi. Navbat bo\'sh.';
        });
      }
    } finally {
      _isAdvancingQueue = false;
    }
  }

  Future<void> _togglePlayback(bool isPlaying) async {
    try {
      if (isPlaying) {
        await _player.pause();
        if (mounted) {
          setState(() {
            _status = 'Pauza: ${_currentTrack?.title ?? ''}';
          });
        }
      } else if (_currentTrack != null) {
        unawaited(_startPlayback());
        if (mounted) {
          setState(() {
            _status = 'Ijro etilmoqda: ${_currentTrack!.title}';
          });
        }
      }
    } on Exception catch (error) {
      if (mounted) {
        setState(() {
          _status = 'Ijroni boshqarishda xato: ${_describeError(error)}';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final track = _currentTrack;
    return Scaffold(
      appBar: AppBar(title: const Text('YouTube Audio')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            TextField(
              controller: _urlController,
              keyboardType: TextInputType.url,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => unawaited(_playInput()),
              decoration: const InputDecoration(
                labelText: 'YouTube URL yoki video ID',
                hintText: 'https://youtu.be/...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: <Widget>[
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _isLoading ? null : _playInput,
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Play'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isLoading ? null : _addToQueue,
                    icon: const Icon(Icons.queue_music),
                    label: const Text('Add to queue'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    if (track != null) ...<Widget>[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          track.thumbnail.toString(),
                          height: 190,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              const SizedBox(
                            height: 190,
                            child: Center(
                              child: Icon(Icons.music_note, size: 64),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        track.title,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(track.author),
                      const SizedBox(height: 8),
                    ],
                    Text(_status),
                    const SizedBox(height: 8),
                    Text('Navbatda: ${_queue.length} ta video'),
                    const SizedBox(height: 8),
                    StreamBuilder<bool>(
                      stream: _player.playingStream,
                      builder: (context, snapshot) {
                        final isPlaying = snapshot.data ?? false;
                        return IconButton.filledTonal(
                          onPressed: track == null || _isLoading
                              ? null
                              : () => _togglePlayback(isPlaying),
                          icon: Icon(
                            isPlaying ? Icons.pause : Icons.play_arrow,
                          ),
                          tooltip: isPlaying ? 'Pauza' : 'Davom ettirish',
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
