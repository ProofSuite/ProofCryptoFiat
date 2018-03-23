import React, { Component } from 'react'
import { Accordion, Form, Icon } from 'semantic-ui-react'
import PropTypes from 'prop-types'

class GasSettings extends Component {
  state = { visible: false }

  toggleGasSettings = e => {
    this.setState({ visible: !this.state.visible })
  }

  render () {
    const { visible } = this.state
    const { gas, gasPrice, handleChange } = this.props

    return (
      <Accordion>
        <Accordion.Title active={visible} index={0} onClick={this.toggleGasSettings}>
          <Icon name='dropdown' />
          Gas Settings
        </Accordion.Title>
        <Accordion.Content active={visible}>
          <Form.Group>
            <Form.Input
              placeholder='Gas'
              name='gas'
              value={gas}
              onChange={handleChange} />
            <Form.Input
              placeholder='Gas Price'
              name='gasPrice'
              value={gasPrice}
              onChange={handleChange}
            />
          </Form.Group>
        </Accordion.Content>
      </Accordion>
    )
  }
}

GasSettings.propTypes = {
  gas: PropTypes.string,
  gasPrice: PropTypes.string,
  handleChange: PropTypes.func
}

export default GasSettings
