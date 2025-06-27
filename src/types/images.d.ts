declare module '*.png' {
  const value: string
  export default value
}

declare global {
  interface Window {
    requestIdleCallback: (
      callback: (deadline: {
        didTimeout: boolean;
        timeRemaining: () => number;
      }) => void,
      options?: { timeout: number }
    ) => number;
  }
}