// Utility to safely extract an array of patients from wildly different API payload shapes
// Falls back to an empty array when nothing usable is found.

const CANDIDATE_KEYS = [
  'patients',
  'data',
  'result',
  'records',
  'items',
  'list'
];

export const normalizePatientsArray = (input) => {
  const visited = new WeakSet();

  const helper = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'object') {
      if (visited.has(value)) {
        return [];
      }
      visited.add(value);

      for (const key of CANDIDATE_KEYS) {
        if (Array.isArray(value?.[key])) {
          return value[key];
        }
      }

      for (const nestedValue of Object.values(value)) {
        const result = helper(nestedValue);
        if (Array.isArray(result)) {
          return result;
        }
      }
    }

    return [];
  };

  const result = helper(input);
  return Array.isArray(result) ? result : [];
};


