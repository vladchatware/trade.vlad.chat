declare module 'next' {
  export type Metadata = {
    [key: string]: unknown
  }
}

declare module 'next/dist/lib/metadata/types/metadata-interface.js' {
  export type Metadata = {
    [key: string]: unknown
  }
  export type ResolvingMetadata = Metadata | Promise<Metadata>
  export type Viewport = {
    [key: string]: unknown
  }
  export type ResolvingViewport = Viewport | Promise<Viewport>
}

declare module 'next/types.js' {
  export type Metadata = {
    [key: string]: unknown
  }
  export type ResolvingMetadata = Metadata | Promise<Metadata>
  export type Viewport = {
    [key: string]: unknown
  }
  export type ResolvingViewport = Viewport | Promise<Viewport>
}

declare module 'next/server.js' {
  export class NextRequest extends Request {}
  export class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): NextResponse
  }
}
