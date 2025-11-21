// utils/MinMaxScaler.ts
export class MinMaxScaler {
    private min: number[] = [];
    private max: number[] = [];
  
    fitTransform(data: number[][]): number[][] {
      if (data.length === 0) return data;
  
      const numFeatures = data[0].length;
      this.min = Array(numFeatures).fill(Number.MAX_SAFE_INTEGER);
      this.max = Array(numFeatures).fill(Number.MIN_SAFE_INTEGER);
  
      // Find min and max for each feature
      for (const row of data) {
        for (let i = 0; i < numFeatures; i++) {
          if (row[i] < this.min[i]) this.min[i] = row[i];
          if (row[i] > this.max[i]) this.max[i] = row[i];
        }
      }
  
      // Transform data
      return this.transform(data);
    }
  
    transform(data: number[][]): number[][] {
      return data.map(row =>
        row.map((val, i) => {
          const range = this.max[i] - this.min[i];
          return range === 0 ? 0 : (val - this.min[i]) / range;
        })
      );
    }
  
    // Thêm method để lưu và load scaler (nếu cần)
    getParams(): { min: number[]; max: number[] } {
      return { min: this.min, max: this.max };
    }
  
    setParams(params: { min: number[]; max: number[] }): void {
      this.min = params.min;
      this.max = params.max;
    }
  }