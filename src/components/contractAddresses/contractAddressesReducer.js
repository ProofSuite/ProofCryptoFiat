let initialState = {
  loading: true,
  contracts: {}
}

export default function (state = initialState, action) {
  switch (action.type) {
    case 'FETCHING_CONTRACT_ADDRESSES':
      return {
        ...state,
        loading: true,
        contracts: {}
      }
    case 'FETCH_CONTRACT_ADDRESSES_SUCCESS':
      return {
        ...state,
        loading: false,
        contracts: action.payload
      }
    case 'FETCH_CONTRACT_ADDRESSES_ERROR':
      return {
        ...state,
        loading: false,
        contracts: {}
      }
    default:
      return state
  }
}
