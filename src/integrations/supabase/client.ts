// Temporary Supabase Client Mock - Until Integration is Activated
// This will be automatically replaced when Supabase integration is properly connected

interface MockSupabaseClient {
  from: (table: string) => MockQuery;
  functions: {
    invoke: (functionName: string, options?: any) => Promise<any>;
  };
  channel: (channelName: string) => MockChannel;
  removeChannel: (channel: MockChannel) => void;
}

interface MockQuery {
  select: (columns?: string) => MockQuery;
  insert: (data: any) => MockQuery;
  update: (data: any) => MockQuery;
  eq: (column: string, value: any) => MockQuery;
  order: (column: string, options?: any) => MockQuery;
  limit: (count: number) => MockQuery;
  single: () => Promise<{ data: any; error: any }>;
  range: (from: number, to: number) => Promise<{ data: any; error: any; count?: number }>;
  then: (callback: (result: { data: any; error: any }) => void) => void;
}

interface MockChannel {
  on: (event: string, config: any, callback: (payload: any) => void) => MockChannel;
  subscribe: () => MockChannel;
}

class MockSupabaseClientImpl implements MockSupabaseClient {
  from(table: string): MockQuery {
    return new MockQueryImpl(table);
  }

  functions = {
    invoke: async (functionName: string, options?: any) => {
      console.log(`Mock Supabase function call: ${functionName}`, options);
      return { data: null, error: null };
    }
  };

  channel(channelName: string): MockChannel {
    return new MockChannelImpl(channelName);
  }

  removeChannel(channel: MockChannel): void {
    console.log('Mock channel removed');
  }
}

class MockQueryImpl implements MockQuery {
  constructor(private table: string) {}

  select(columns?: string): MockQuery {
    return this;
  }

  insert(data: any): MockQuery {
    console.log(`Mock insert to ${this.table}:`, data);
    return this;
  }

  update(data: any): MockQuery {
    console.log(`Mock update to ${this.table}:`, data);
    return this;
  }

  eq(column: string, value: any): MockQuery {
    return this;
  }

  order(column: string, options?: any): MockQuery {
    return this;
  }

  limit(count: number): MockQuery {
    return this;
  }

  async single(): Promise<{ data: any; error: any }> {
    return { data: this.getMockData(), error: null };
  }

  async range(from: number, to: number): Promise<{ data: any; error: any; count?: number }> {
    const mockData = Array.from({ length: to - from + 1 }, (_, i) => this.getMockData(i));
    return { data: mockData, error: null, count: mockData.length };
  }

  then(callback: (result: { data: any; error: any }) => void): void {
    callback({ data: [this.getMockData()], error: null });
  }

  private getMockData(index: number = 0): any {
    switch (this.table) {
      case 'analysis_reports':
        return {
          id: `report-${index}`,
          report_type: 'OPERATIONAL_RISK',
          risk_level: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][index % 4],
          confidence_score: 0.8 + (index % 3) * 0.1,
          requires_action: index % 2 === 0,
          generated_at: new Date().toISOString(),
          analysis_data: { mock: true }
        };
      
      case 'lab_production_queue':
        return {
          id: `job-${index}`,
          job_code: `LAB-${1000 + index}`,
          job_type: 'CAD/CAM Crown',
          status: ['QUEUED', 'IN_PROGRESS', 'COMPLETED'][index % 3],
          priority: 5 + (index % 5),
          estimated_duration: '45 minutes',
          patients: {
            patient_code: `P-${1000 + index}`,
            profiles: { full_name: `Patient ${index + 1}` }
          }
        };
      
      default:
        return { id: `mock-${index}`, mock: true };
    }
  }
}

class MockChannelImpl implements MockChannel {
  constructor(private channelName: string) {}

  on(event: string, config: any, callback: (payload: any) => void): MockChannel {
    console.log(`Mock channel ${this.channelName} listening for ${event}`);
    return this;
  }

  subscribe(): MockChannel {
    console.log(`Mock channel ${this.channelName} subscribed`);
    return this;
  }
}

// Export the mock client
export const supabase = new MockSupabaseClientImpl();