export const getTopCrimeDistrictsDef = {
  name: 'getTopCrimeDistricts',
  description: 'Retrieves the top districts with the highest volume of crimes within a specific time period.',
  parameters: {
    type: 'object',
    properties: {
      dateRange: {
        type: 'object',
        description: 'The date range to filter by.',
        properties: {
          start: { type: 'string', description: 'Start date in YYYY-MM-DD' },
          end: { type: 'string', description: 'End date in YYYY-MM-DD' }
        },
        required: ['start', 'end']
      },
      limit: {
        type: 'number',
        description: 'How many top districts to return (default is 5).'
      },
      reasoning: {
        type: 'string',
        description: 'Explain why you are calling this tool.'
      }
    },
    required: ['dateRange', 'reasoning']
  }
};
