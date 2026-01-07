export class TransformStreamExample<T = any, R = any> {
  constructor(transform: (chunk: T) => R | Promise<R>) {
    this.transform = transform;
  }
  private transform: (chunk: T) => R | Promise<R>;
}

export class SSEParserTransform extends TransformStreamExample<string, any> {
  constructor() {
    super((chunk) => {
      const lines = chunk.split('\n');
      const data: any = {};
      let currentType = '';
      let currentData = '';
      for (const line of lines) {
        if (line.startsWith('event:')) {
          if (currentType && currentData) {
            try {
              data[currentType] = JSON.parse(currentData);
            } catch {}
          }
          currentType = line.slice(6).trim();
          currentData = '';
        } else if (line.startsWith('data:')) {
          currentData = line.slice(5).trim();
        }
      }
      if (currentType && currentData) {
        try {
          data[currentType] = JSON.parse(currentData);
        } catch {}
      }
      return data;
    });
  }
}

export class SSESerializerTransform extends TransformStreamExample<any, string> {
  constructor() {
    super((chunk) => {
      if (chunk.event) {
        return `event: ${chunk.event}\ndata: ${JSON.stringify(chunk.data)}\n\n`;
      }
      return '';
    });
  }
}

export function rewriteStream(stream: ReadableStream, transform: (data: any, controller: any) => any): ReadableStream {
  return stream;
}
