import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const D3Canvas = () => {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    // Create a group for the canvas elements
    const canvasGroup = svg.append('g');

    // Create a rectangle
    const rect = canvasGroup.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'lightblue');

    // Zoom and drag behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        canvasGroup.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Click event to get coordinates
    rect.on('click', (event) => {
    //   const [x, y] = d3.pointer(event);
    //   console.log(`x: ${x}, y: ${y}`);
    //   alert(`x: ${x}, y: ${y}`);
    });

  }, []);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ border: '1px solid black', width: '800px', height: '600px' }}
    ></svg>
  );
};

export default D3Canvas;
