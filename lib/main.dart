import 'dart:async';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  runApp(const YouTubeBrowserApp());
}

class YouTubeBrowserApp extends StatelessWidget {
  const YouTubeBrowserApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'YouTube Browser',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF0033),
        ),
        useMaterial3: true,
      ),
      home: const YouTubeHomePage(),
    );
  }
}

class YouTubeHomePage extends StatefulWidget {
  const YouTubeHomePage({super.key});

  @override
  State<YouTubeHomePage> createState() => _YouTubeHomePageState();
}

class _YouTubeHomePageState extends State<YouTubeHomePage> {
  late final WebViewController _controller;
  bool _isLoading = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) {
              setState(() {
                _isLoading = true;
                _loadError = null;
              });
            }
          },
          onPageFinished: (_) {
            if (mounted) {
              setState(() {
                _isLoading = false;
                _loadError = null;
              });
            }
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame != false && mounted) {
              setState(() {
                _isLoading = false;
                _loadError =
                    'YouTube sahifasini yuklab bo‘lmadi. Internetni tekshirib, '
                    'qayta urinib ko‘ring.';
              });
            }
          },
        ),
      )
      ..loadRequest(Uri.parse('https://m.youtube.com/'));
  }

  Future<void> _goBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
    }
  }

  Future<void> _goForward() async {
    if (await _controller.canGoForward()) {
      await _controller.goForward();
    }
  }

  Future<void> _reload() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _loadError = null;
      });
    }
    await _controller.reload();
  }

  Future<void> _showAbout() async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ilova haqida'),
        content: const Text(
          'Bu ilova YouTube’ning rasmiy mobil saytini ochadi. '
          'Video ijrosi YouTube qoidalari va akkauntingiz imkoniyatlari '
          'bilan boshqariladi. Ilova YouTube cheklovlarini chetlab o‘tmaydi; '
          'ekran o‘chiq paytdagi ijro YouTube tomonidan ruxsat etilishiga '
          'bog‘liq.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Tushunarli'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loadError = _loadError;
    return Scaffold(
      appBar: AppBar(
        title: const Text('YouTube Browser'),
        actions: <Widget>[
          IconButton(
            onPressed: () => unawaited(_showAbout()),
            tooltip: 'Ilova haqida',
            icon: const Icon(Icons.info_outline),
          ),
          IconButton(
            onPressed: () => unawaited(_reload()),
            tooltip: 'Yangilash',
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: <Widget>[
          if (_isLoading) const LinearProgressIndicator(),
          Expanded(
            child: Stack(
              children: <Widget>[
                WebViewWidget(controller: _controller),
                if (loadError != null)
                  Positioned.fill(
                    child: ColoredBox(
                      color: Theme.of(context).scaffoldBackgroundColor,
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: <Widget>[
                              const Icon(Icons.wifi_off, size: 48),
                              const SizedBox(height: 12),
                              Text(
                                loadError,
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 16),
                              FilledButton.icon(
                                onPressed: () => unawaited(_reload()),
                                icon: const Icon(Icons.refresh),
                                label: const Text('Qayta urinish'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                IconButton(
                  onPressed: () => unawaited(_goBack()),
                  tooltip: 'Orqaga',
                  icon: const Icon(Icons.arrow_back),
                ),
                IconButton(
                  onPressed: () => unawaited(_goForward()),
                  tooltip: 'Oldinga',
                  icon: const Icon(Icons.arrow_forward),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
