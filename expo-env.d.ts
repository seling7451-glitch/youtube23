/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_AUDIUS_API_KEY?: string;
    readonly EXPO_PUBLIC_JAMENDO_CLIENT_ID?: string;
  }
}
