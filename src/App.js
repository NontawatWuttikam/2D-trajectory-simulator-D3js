import React, { Component } from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import { MainApp } from './ChartWrapper';
import D3Canvas from './D3Canvas';

class App extends Component {
  render() {
    return (
      <div>
        {/* <Navbar bg="light">
          <Navbar.Brand>CreateD3App</Navbar.Brand>
        </Navbar> */}
        <MainApp />
      </div>
    );
  }
}

export default App;
