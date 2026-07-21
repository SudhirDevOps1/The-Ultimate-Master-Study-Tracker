/**
 * Download Performance Optimization Module
 * Handles efficient data processing and memory management for downloads
 */

export class DownloadOptimizer {
  /**
   * Process large arrays in chunks to avoid UI blocking
   */
  static async processInChunks<T, R>(
    items: T[],
    processor: (item: T) => R,
    chunkSize: number = 100
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const processed = chunk.map(processor);
      results.push(...processed);

      // Allow UI to update between chunks
      if (i + chunkSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return results;
  }

  /**
   * Estimate download size
   */
  static estimateSize(data: any): string {
    const jsonString = JSON.stringify(data);
    const bytes = new Blob([jsonString]).size;
    
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  /**
   * Compress data for export (basic compression using string replacement)
   */
  static compressJSON(data: any): string {
    let json = JSON.stringify(data);
    
    // Replace common long strings with shorter versions
    json = json.replace(/"startTime"/g, '"t1"');
    json = json.replace(/"endTime"/g, '"t2"');
    json = json.replace(/"subjectId"/g, '"sid"');
    json = json.replace(/"plannedMinutes"/g, '"pm"');
    json = json.replace(/"actualSeconds"/g, '"as"');
    json = json.replace(/"status"/g, '"st"');
    json = json.replace(/"completed"/g, '"c"');
    json = json.replace(/"incomplete"/g, '"i"');
    json = json.replace(/"abandoned"/g, '"a"');
    
    return json;
  }

  /**
   * Decompress data from export
   */
  static decompressJSON(json: string): any {
    let data = json;
    
    // Reverse the compression
    data = data.replace(/"t1"/g, '"startTime"');
    data = data.replace(/"t2"/g, '"endTime"');
    data = data.replace(/"sid"/g, '"subjectId"');
    data = data.replace(/"pm"/g, '"plannedMinutes"');
    data = data.replace(/"as"/g, '"actualSeconds"');
    data = data.replace(/"st"/g, '"status"');
    data = data.replace(/"c"/g, '"completed"');
    data = data.replace(/"i"/g, '"incomplete"');
    data = data.replace(/"a"/g, '"abandoned"');
    
    return JSON.parse(data);
  }

  /**
   * Safe blob creation with memory cleanup
   */
  static createSafeBlob(content: string, mimeType: string): Blob {
    return new Blob([content], { type: mimeType });
  }

  /**
   * Generate optimized CSV avoiding memory issues
   */
  static generateCSVStream(
    headers: string[],
    rowGenerator: () => Generator<string[]>,
    onChunk?: (chunk: string) => void
  ): string {
    let csv = headers.join(",") + "\n";

    for (const row of rowGenerator()) {
      csv += row.join(",") + "\n";
      
      if (onChunk && csv.length > 10000) {
        onChunk(csv);
        csv = "";
      }
    }

    if (csv) onChunk?.(csv);
    return csv;
  }
}

/**
 * Debounce download attempts to prevent duplicate downloads
 */
export class DownloadThrottler {
  private lastDownload = 0;
  private minInterval = 1000; // 1 second minimum between downloads

  canDownload(): boolean {
    const now = Date.now();
    if (now - this.lastDownload > this.minInterval) {
      this.lastDownload = now;
      return true;
    }
    return false;
  }

  reset(): void {
    this.lastDownload = 0;
  }
}

// Global throttler instance
export const downloadThrottler = new DownloadThrottler();
