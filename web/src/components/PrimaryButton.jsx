import React from 'react';

class PrimaryButton extends React.Component {
  render() {
    return (
      <button className="btn-primary" onClick={this.props.onClick}>
        {this.props.label}
      </button>
    );
  }
}

export default PrimaryButton;
