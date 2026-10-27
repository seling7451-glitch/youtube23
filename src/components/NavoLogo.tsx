import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export function NavoLogo({ size = 38 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="navo" x1="13" y1="12" x2="88" y2="88">
          <Stop stopColor="#45DCC0" />
          <Stop offset="1" stopColor="#A880FF" />
        </LinearGradient>
      </Defs>
      <Path d="M22 75V25l40 45V25" stroke="url(#navo)" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M73 40v20m10-34v48m10-37v26" stroke="url(#navo)" strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );
}
