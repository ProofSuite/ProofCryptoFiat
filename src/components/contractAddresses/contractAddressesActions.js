import store from '../../redux-store'
import CryptoDollarInterface from '../../../build/contracts/CryptoDollar.json'
import CryptoFiatHubInterface from '../../../build/contracts/CryptoFiatHub.json'
import RewardsInterface from '../../../build/contracts/Rewards.json'
import StoreInterface from '../../../build/contracts/Store.json'
import { getTruffleContractAddress } from '../../helpers/contractHelpers'

const actions = {
  fetchingContractAddresses: () => ({ type: 'FETCHING_CONTRACT_ADDRESSES ' }),
  fetchContractAddressesSuccess: (contracts) => ({ type: 'FETCH_CONTRACT_ADDRESSES_SUCCESS', payload: contracts }),
  fetchContractAddressesError: () => ({ type: 'FETCH_CONTRACT_ADDRESSES_ERROR' })
}

export const fetchContractAddresses = () => {
  return async dispatch => {
    dispatch(actions.fetchingContractAddresses())

    let web3 = store.getState().web3.web3Instance
    if (typeof web3 === 'undefined') return dispatch(actions.fetchingContractAddressesError())

    let cryptoFiatHubAddress = getTruffleContractAddress(CryptoFiatHubInterface)
    let cryptoDollarAddress = getTruffleContractAddress(CryptoDollarInterface)
    let rewardsAddress = getTruffleContractAddress(RewardsInterface)
    let keyValueStoreAddress = getTruffleContractAddress(StoreInterface)

    console.log(keyValueStoreAddress)

    let results = {
      cryptoDollar: cryptoDollarAddress,
      cryptoFiatHub: cryptoFiatHubAddress,
      rewards: rewardsAddress,
      store: keyValueStoreAddress
    }

    dispatch(actions.fetchContractAddressesSuccess(results))
  }
}
