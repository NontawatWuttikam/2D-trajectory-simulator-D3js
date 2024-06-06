import React, { useRef, useState, useEffect } from 'react';
import D3Chart from './D3Chart';
import * as d3 from "d3";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import "./ChartWrapper.css"

function isNumeric(str) {
	if (typeof str != "string") return false // we only process strings!  
	return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
		   !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
  }

const CLICK_DISTANCE_THRESH = 1;
const INITIAL_WIDTH = 800
const INITIAL_HEIGHT = 700

const CLASS_OPTIONS = [
	"person",
	"forklift",
	"car"
]

const CLASS_COLORS_MAP = {
	"person":"lime",
	"forklift":"yellow",
	"car":"brown"
}

const CLASS_EMOJI_MAP = {
	"person":"🟢",
	"forklift":"🟡",
	"car":"🟤"
}

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

	const addPointToSvg = (cx, cy, r = 10, fill = 'green', stroke=false) => {
		svgElement.append("circle").attr('cx', cx)
		.attr('cy', cy)
		.attr('r', r)
		.style('fill', fill)
		.style('stroke', "red")
		.style('stroke-width', (stroke)? 3 : 0)
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
		svgElement.selectAll("rect").remove()
		svgElement.selectAll("line").remove()

		let prevDot = null
		props.dataPoints.forEach((dataPoint, index)=>{
			console.log("dataPoint",dataPoint)
			let pointColor = CLASS_COLORS_MAP[dataPoint.class]
			let stroke = false
			if (index == props.clickedPointIdx) {
				stroke = true
			} 
			let viewportX = dataPoint.x - props.tX.current
			let viewportY = dataPoint.y - props.tY.current
		
			prevDot = {x: viewportX, y: viewportY}

			// draw trajectory mark
			dataPoint.trajectories.forEach((trajectory)=>{
				let markX = trajectory.x - props.tX.current
				let markY = trajectory.y - props.tY.current
				svgElement.append("rect").attr('x', markX)
				.attr('y', markY)
				.attr('width', 5)
				.attr('height', 5)
				.style('fill', 'black')
				
				svgElement.append("line")
				.attr("x1", prevDot.x)
				.attr("y1", prevDot.y)
				.attr("x2", markX)
				.attr("y2", markY)
				.style('stroke', 'rgb(180, 180, 180)')
      			.style('stroke-width', 2);

				prevDot = {x: markX, y: markY}
			})
			
			addPointToSvg(viewportX, viewportY, 10, pointColor, stroke)
		})
	}

	const onMapClick = (event) => {
		if (isPointClicked.current) {
			isPointClicked.current = false;
			return;
		}

		if (props.clickMode == "point") {
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
				class: "person",
				speed: 0,
				trajectories: [],
			}]));

			addPointToSvg(x,y);
		}
		if (props.clickMode == "trajectory") {
			// alert("click trajectory!")
			var x = event.clientX - event.target.getBoundingClientRect().left;
			var y = event.clientY - event.target.getBoundingClientRect().top;
			x = x + props.tX.current
			y = y + props.tY.current
			var tempDataPoints = props.dataPoints
			tempDataPoints[props.clickedPointIdx].trajectories.push({x:x, y:y})
			props.setDataPoints(tempDataPoints)
			console.log("props.dataPoints traj",props.dataPoints)
			refreshPointsSvg();
		}
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
	}, [props.dataPoints, props.clickedPointIdx, props.clickMode])

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

	var [width, setWidth] = useState(INITIAL_WIDTH);
	var [height, setHeight] = useState(INITIAL_HEIGHT);

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
				<Col md="auto">
					Width
				</Col>
				<Col md="auto">
					<input type='text' onChange={onWidthChange}></input>
				</Col>
			</Row>
			<Row>
			<Col md="auto">
					Height
				</Col>
				<Col md="auto">
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

	const onClassOptionsDropDownClick = (event) => {
		console.log("selecting", event.target.value)
		let newDataPoints = props.dataPoints;
		newDataPoints[props.clickedPointIdx].class = event.target.value;
		props.setDataPoints(newDataPoints);
	}

	const onSpeedInputChanged = (event) => {
		if (!isNumeric(event.target.value)) {
			event.target.value = props.dataPoints[props.clickedPointIdx].speed
		}
		else {
			let newSpeed = parseFloat(event.target.value)
			props.dataPoints[props.clickedPointIdx].speed = newSpeed
		}
		console.log("dooooooo00000000000000000000000")
	}

	const onEditTrajectoryClick = (event) => {
		props.setClickMode("trajectory");
	}

	const onFinishEditTrajectoryClick = (event) => {
		props.setClickMode("point");
	}

	useEffect(()=>{
		if (props.dataPoints.length != 0) document.getElementById("speed-input").value = props.dataPoints[props.clickedPointIdx].speed
	}, [props.clickedPointIdx])

	return (
		<>
			<h3>Edit Point</h3>
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
					<Row>
						<Col>
							Y
						</Col>
						<Col>
							{props.dataPoints[props.clickedPointIdx].y}
						</Col>
					</Row>
					<Row>
						<Col>
							Class
						</Col>
						<Col>
							<select name="class" id="class" onClick={onClassOptionsDropDownClick}>
								{CLASS_OPTIONS.map((clas) => {
									if (clas == props.dataPoints[props.clickedPointIdx].class)
										return (<option value = {clas} selected>{CLASS_EMOJI_MAP[clas]} {clas}</option>)
									return (<option value = {clas}>{CLASS_EMOJI_MAP[clas]} {clas}</option>)
									} 	
								)}
							</select>
						</Col>
					</Row>
					<Row>
						<Col>
							Speed
						</Col>
						<Col>
							<input id="speed-input" type="text" onBlur={onSpeedInputChanged} defaultValue={props.dataPoints[props.clickedPointIdx].speed}></input>
						</Col>
					</Row>
					<Row>
						<Col>
							{
								(props.clickMode == "point") ?
								<>
									<button onClick={onEditTrajectoryClick}>Edit Trajectory</button>
								</>
								:
								<>
									<button onClick={onFinishEditTrajectoryClick}>Finish Edit</button>
								</>
							}
						</Col>
						<Col>
							{/* {
								props.dataPoints[props.clickedPointIdx].trajectories.map((trajectory)=>{
									console.log("hello")
									return (<><p>x:{trajectory.x} y:{trajectory.y}</p><br/></>)
								})
							} */}
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
	var [width, setWidth] = useState(INITIAL_WIDTH);
	var [height, setHeight] = useState(INITIAL_HEIGHT);
	var [dataPoints, setDataPoints]= useState([]);
	var tX = useRef(0.0)
	var tY = useRef(0.0)
	var [clickedPointIdx, setClickedPointIdx] = useState(0)
	var [clickMode, setClickMode] = useState("point")

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
						clickMode={clickMode}
						tX={tX} 
						tY={tY}
					/>	
				</Col>
				<Col>
					<PointEditor
						dataPoints={dataPoints}
						setDataPoints={setDataPoints}
						clickedPointIdx={clickedPointIdx}
						clickMode={clickMode}
						setClickMode={setClickMode}
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