declare module 'node:test' {
  type TestFunction = (name: string, body: () => void | Promise<void>) => void;
  const test: TestFunction;
  export default test;
}

declare module 'node:assert/strict' {
  interface StrictAssert {
    ok(value: unknown, message?: string): asserts value;
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    match(actual: string, expected: RegExp, message?: string): void;
  }
  const assert: StrictAssert;
  export default assert;
}
