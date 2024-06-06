import React, { useRef, useState, useEffect } from 'react';
import D3Chart from './D3Chart';
import * as d3 from "d3";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';


const CLICK_DISTANCE_THRESH = 1;

const Svg = (
	props
) => {

	// svg
	const ref = useRef()
	const svgElement = d3.select(ref.current)

	var [clickCoord, setClickCoord] = useState({})
	var prevDragCoord = useRef(null)
	var axisGeneratorBottom = useRef(null)
	var axisGeneratorRight = useRef(null)
	var xScale = useRef(null)
	var yScale = useRef(null)
	var isPointClicked = useRef(false)

	const addPointToSvg = (cx, cy, r = 20, fill = 'green') => {
		svgElement.append("circle").attr('cx', cx)
		.attr('cy', cy)
		.attr('r', r)
		.style('fill', fill)
		.on("click", ()=>{
			isPointClicked.current = true;
			
			let x = d3.event.x + props.tX.current;
			let y = d3.event.y + props.tY.current;

			console.log("xytxty", d3.event.x, d3.event.y,  props.tX.current, props.tY.current,x,y)
			let clickedToPointDists = props.dataPoints.map((dataPoint)=>{
				return Math.pow((dataPoint.x - x),2) + Math.pow((dataPoint.y - y),2)
			})
			let closestDist = Math.min(...clickedToPointDists)

			props.setClickedPointIdx(clickedToPointDists.indexOf(closestDist))
			console.log("closestDist",clickedToPointDists,closestDist, props.clickedPointIdx)
			refreshPointsSvg();		
		});
	}

	const refreshPointsSvg = ()=>{
		svgElement.selectAll("circle").remove()
		props.dataPoints.forEach((dataPoint, index)=>{
			console.log("dataPoint",dataPoint)
			let pointColor = "green"
			if (index == props.clickedPointIdx) {
				pointColor = "red"
			} 
			addPointToSvg(dataPoint.x - props.tX.current, dataPoint.y - props.tY.current, 20, pointColor)
		})
	}

	const onMapClick = (event) => {
		if (isPointClicked.current) {
			isPointClicked.current = false;
			return;
		}

		var x = event.clientX - event.target.getBoundingClientRect().left;
		var y = event.clientY - event.target.getBoundingClientRect().top;

		console.log("click", clickCoord)
		setClickCoord({
			x: x,
			y: y
		})

		props.setDataPoints(props.dataPoints.concat([{
			x: x + props.tX.current,
			y: y + props.tY.current,
			class: "person"
		}]));

		addPointToSvg(x,y);
	}

	// // on datapoints update
	// useEffect(()=>{
	// 	console.log("dataPoints", props.dataPoints)
	// },[props.dataPoints])


	svgElement.call(d3.drag()
		.on("drag", ()=>{
			// console.log("isDragging",isDragging)
			if (prevDragCoord.current == null) {
				prevDragCoord.current = {
					x: d3.event.x,
					y: d3.event.y
				}
			}
			else {
				let dTX = d3.event.x - prevDragCoord.current.x;
				let dTY = d3.event.y - prevDragCoord.current.y;

				props.tX.current -= dTX;
				props.tY.current -= dTY;
	
				console.log("dtx, dty", dTX, dTY)
				console.log("props.tXtY", props.tX, props.tY)

				prevDragCoord.current = {
					x: d3.event.x,
					y: d3.event.y
				}

				// update scale bars
				xScale.current = d3.scaleLinear()
					.range([0,props.width])
					.domain([props.tX.current, props.tX.current+props.width])
	  			axisGeneratorBottom.current = d3.axisBottom(xScale.current)

				yScale.current = d3.scaleLinear()
				  .range([0,props.width])
				  .domain([props.tY.current, props.tY.current+props.height])
				axisGeneratorRight.current = d3.axisRight(yScale.current)

				svgElement.select("g.x.axis").call(axisGeneratorBottom.current)
				svgElement.select("g.y.axis").call(axisGeneratorRight.current)

				// update points
				refreshPointsSvg()
				
			}
		})
		.on("end", ()=>{
			prevDragCoord.current = null
			console.log("end drag")
		})
	)

	// re render when click points or add points
	useEffect(()=> {
		refreshPointsSvg();
	}, [props.dataPoints, props.clickedPointIdx])

	useEffect(() => {
	  xScale.current = d3.scaleLinear()
		.domain([0, props.width])
		.range([0, props.width])
	  yScale.current = d3.scaleLinear()
	  	.domain([0, props.width])
	  	.range([0, props.width])
	  const svgElement = d3.select(ref.current)
	  axisGeneratorBottom.current = d3.axisBottom(xScale.current)
	  axisGeneratorRight.current = d3.axisRight(yScale.current)
	  if (svgElement.select("g").empty()) {
		svgElement.append("g")
		    .attr("class", "x axis")
			.call(axisGeneratorBottom.current)
			svgElement.append("g")
			.attr("class", "y axis")
			.call(axisGeneratorRight.current)
	  }
	  else {
		console.log("update axis")
		svgElement.selectAll("g.x.axis").call(axisGeneratorBottom.current)
		svgElement.selectAll("g.y.axis").call(axisGeneratorRight.current)
	  }
	
	}, [props.width, props.height])

	return (
	  <svg 
		ref={ref}
		onClick={onMapClick}
		style={{
			border: "2px solid gold",
			height: props.height,
			width: props.width
		}} 
	  />
	)
}

const SvgSizeEditPanel = (
	props,
) => {

	var [width, setWidth] = useState(700);
	var [height, setHeight] = useState(700);

	const onWidthChange = (event) => {
		setWidth(parseInt(event.target.value))
	}

	const onHeightChange = (event) => {
		setHeight(parseInt(event.target.value))
	}

	const onClick = (event) => {
		console.log("setWidthCallback",props.setWidthCallback, props.setHeightCallback)
		props.setWidthCallback(width)
		props.setHeightCallback(height)
	}

	return (
		<div>
			<Row>
				<Col>
					Width
				</Col>
				<Col>
					<input type='text' onChange={onWidthChange}></input>
				</Col>
			</Row>
			<Row>
				<Col>
					Height
				</Col>
				<Col>
					<input type='text' onChange={onHeightChange}></input>
				</Col>
			</Row>
			<Row>
				<button onClick={onClick}>Reset ViewPort</button>
			</Row>
		</div>
	)
}

const PointEditor = (
	props
) => {

	return (
		<>
			Edit Point
			{
				(props.dataPoints.length != 0) ?
				<>
					<Row>
					<Col>
						X
					</Col>
					<Col>
						{props.dataPoints[props.clickedPointIdx].x}
					</Col>
					</Row>
				</>
				:
				<></>
			}
			
		</>
	)
}

export const MainApp = () => {
	var [width, setWidth] = useState(700);
	var [height, setHeight] = useState(700);
	var [dataPoints, setDataPoints]= useState([]);
	var tX = useRef(0.0)
	var tY = useRef(0.0)
	var [clickedPointIdx, setClickedPointIdx] = useState(0)

	useEffect(()=>{
		console.log("dataPoints", dataPoints)
	},[dataPoints])

	return (
		<>
			<Row>
				<Col>
					<Svg 
						width={width} 
						height={height} 
						dataPoints={dataPoints} 
						setDataPoints={setDataPoints}
						clickedPointIdx={clickedPointIdx}
						setClickedPointIdx={setClickedPointIdx}
						tX={tX} 
						tY={tY}
					/>	
				</Col>
				<Col>
					<PointEditor
						dataPoints={dataPoints}
						clickedPointIdx={clickedPointIdx}
					/>
				</Col>
			</Row>
			
			<SvgSizeEditPanel 
				setWidthCallback={setWidth}
				setHeightCallback={setHeight}
			/>
		</>
	)
}