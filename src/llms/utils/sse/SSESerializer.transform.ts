export class SSESerializerTransform {
  transform(chunk: any): string {
    if (chunk.event) {
      return `event: ${chunk.event}\ndata: ${JSON.stringify(chunk.data)}\n\n`;
    }
    return '';
  }
}
