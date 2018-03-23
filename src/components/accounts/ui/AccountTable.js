import React from 'react'
import AccountRow from './AccountRow'
import { Table, Loader } from 'semantic-ui-react'
import PropTypes from 'prop-types'

const AccountTable = (props) => {
  const accounts = props.accounts
  const listAccounts = accounts.map((account, index) => (
    <AccountRow
      key={index}
      address={account.address}
      etherBalance={account.etherBalance}
      cryptoDollarBalance={account.cryptoDollarBalance}
    />
  ))

  return (
    <Table celled>
      <Table.Header>
        <Table.Row active>
          <Table.HeaderCell>Address</Table.HeaderCell>
          <Table.HeaderCell>Ethereum Balance</Table.HeaderCell>
          <Table.HeaderCell>CryptoDollar Balance</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
      { accounts ? listAccounts : <Loader>Loading</Loader>}
      </Table.Body>
    </Table>
  )
}

AccountTable.propTypes = {
  accounts: PropTypes.array
}

export default AccountTable
