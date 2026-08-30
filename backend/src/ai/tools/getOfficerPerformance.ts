export const getOfficerPerformanceDef = {
  name: 'getOfficerPerformance',
  description: 'Retrieves performance metrics and case statistics for a specific police officer by their name or Employee ID.',
  parameters: {
    type: 'object',
    properties: {
      officerIdentifier: {
        type: 'string',
        description: 'The name or EmployeeID of the officer (e.g. "Kiran Desai" or "10427")'
      },
      reasoning: {
        type: 'string',
        description: 'Explain why you are querying this officer.'
      }
    },
    required: ['officerIdentifier', 'reasoning']
  }
};
