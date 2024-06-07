import React, { useRef, useState, useEffect } from 'react';
import D3Chart from './D3Chart';
import * as d3 from "d3";
import * as jStat from "jstat"
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
	var startSimTime = useRef(new Date().getTime())
	var [playIntervalId, setPlayIntervalId] = useState(0)
	var currentSimTime = useRef(new Date().getTime())
	var prevDragCoord = useRef(null)
	var axisGeneratorBottom = useRef(null)
	var axisGeneratorRight = useRef(null)
	var xScale = useRef(null)
	var yScale = useRef(null)
	var isPointClicked = useRef(false)

	const isNotEditMode = () => {
		return props.mode == "play" || props.mode == "pause"
	}

	const computePointLocationOnTrajectoryLines = (initialPoint, trajectories, distance) => {
		if (trajectories.length == 0) return initialPoint
		let a = initialPoint
		let tj = trajectories
		let accumDist = 0;
		console.log("trajectories", tj)
		for (let i = 0; i < trajectories.length; i++) {
			let a2bDist = Math.sqrt(Math.pow((a.x - tj[i].x), 2) + Math.pow((a.y - tj[i].y), 2))
			console.log("iter",i)
			console.log("a2bDist", a2bDist)
			console.log("distance", distance)
			console.log("accumDist", accumDist)
			console.log("a", a)
			console.log("tj[i]", tj[i])
			if ((accumDist + a2bDist) < distance) {
				accumDist += a2bDist
				a = tj[i];
				continue
			}
			else {
				console.log("compute in-between point")
				console.log("accumDist + a2bDist", accumDist + a2bDist)
				let finalDist = a2bDist - ((accumDist + a2bDist) - distance)
				console.log("finalDist", finalDist)
				let ratio = finalDist/a2bDist
				let pointX = a.x + (ratio*(tj[i].x - a.x))
				let pointY = a.y + (ratio*(tj[i].y - a.y))
				return {x: pointX, y:pointY}
			}
		}
		// in case of distance > actual traj distance. stop
		return {
				x: tj[tj.length - 1].x, 
				y: tj[tj.length - 1].y
			}
	}

	const computeUncertainPoint = (point, uncertainty) => {
		if (uncertainty === 0) return point;
	
		const { x, y } = point;
	
		// Sample from a normal distribution with mean 0 and standard deviation equal to the square root of the variance
		const offsetX = jStat.normal.sample(0, Math.sqrt(uncertainty));
		const offsetY = jStat.normal.sample(0, Math.sqrt(uncertainty));
	
		// Add the sampled offsets to the original point
		const sampledPoint = {
			x: x + offsetX,
			y: y + offsetY
		};
	
		return sampledPoint;
	}

	const addPointToSvg = (cx, cy, r = 10, fill = 'green', stroke=false) => {
		svgElement.append("circle").attr('cx', cx)
		.attr('cy', cy)
		.attr('r', r)
		.style('fill', fill)
		.style('stroke', "red")
		.style('stroke-width', (stroke)? 3 : 0)
		.on("click", ()=>{
			if (isNotEditMode()) return;

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

			let pointX = dataPoint.x
			let pointY = dataPoint.y
			let deltaT = 0

			if (props.mode == "play") {
				currentSimTime.current = new Date().getTime()
				deltaT = currentSimTime.current - startSimTime.current
				console.log("startSimTime", startSimTime)
				console.log("currentSimTime",currentSimTime)
				console.log("deltaT", deltaT)
			}

			if (props.mode == "play" || props.mode == "pause") {
				// use current point xy instead of start point xy
				let distance = dataPoint.speed*deltaT
				let pointLocationOnTrajectoryLines = computePointLocationOnTrajectoryLines(
					{x: dataPoint.x, y: dataPoint.y},
					dataPoint.trajectories,
					distance
				)

				console.log("pointLocationOnTrajectoryLines", pointLocationOnTrajectoryLines)

				// add uncertainty to make a point shaky
				pointLocationOnTrajectoryLines = computeUncertainPoint(pointLocationOnTrajectoryLines, dataPoint.uncertainty)

				pointX = pointLocationOnTrajectoryLines.x
				pointY = pointLocationOnTrajectoryLines.y				

				console.log("pointLocationOnTrajectoryLines", pointLocationOnTrajectoryLines)

			}

			let pointColor = CLASS_COLORS_MAP[dataPoint.class]
			let stroke = false
			if (index == props.clickedPointIdx) {
				stroke = true
			}

			let viewportX = pointX - props.tX.current
			let viewportY = pointY - props.tY.current
		
			prevDot = {x: dataPoint.x - props.tX.current, y: dataPoint.y - props.tY.current}

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

	const onPlay = () => {
		startSimTime.current = new Date().getTime()
		var intervalId = setInterval(()=>{
			refreshPointsSvg()
			console.log("onPlay")
		}, 10)
		setPlayIntervalId(intervalId)

	}

	const resetSvgStates = () => {
		clearInterval(playIntervalId)
		refreshPointsSvg()
	}	

	const onMapClick = (event) => {
		if (isNotEditMode()) return;

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
				currentX: x + props.tX.current, // for simulation
				currentY: y + props.tY.current, //
				class: "person",
				speed: 0.5,
				uncertainty: 0.0,
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
			var tempDataPoints = [...props.dataPoints]
			tempDataPoints[props.clickedPointIdx].trajectories.push({x:x, y:y})
			props.setDataPoints(tempDataPoints)
			console.log("props.dataPoints traj",props.dataPoints)
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

	useEffect(()=>{
		if (props.mode == "edit") {
			resetSvgStates()
		}

		else if (props.mode == "play") {
			onPlay()
		}

		else if (props.mode == "pause") {
			clearInterval(playIntervalId)
		}
	}, [props.mode])

	// re render when datapoints and click change
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

const ControlPanel = (
	props
) => {

	const onPlayClicked = (event) => {
		props.setMode("play")
	}

	const onPauseClicked = (event) => {
		props.setMode("pause")
	}

	const onStopClicked = (event) => {
		props.setMode("edit")
	}

	return (
		<>
		<Row>
			<Col md="auto">
				<button onClick={onPlayClicked}> ▶️ Play</button>
			</Col>
			<Col md="auto">
				<button onClick={onPauseClicked}> ▐▐ Pause</button>	
			</Col>
			<Col md="auto">
				<button onClick={onStopClicked}> ◼ Stop</button>
			</Col>
		</Row>
		</>
	)
}

const PointEditor = (
	props
) => {

	const onClassOptionsDropDownClick = (event) => {
		console.log("selecting", event.target.value)
		let newDataPoints = props.dataPoints
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
	}

	const onPointUncertaintyInputChanged = (event) => {
		if (!isNumeric(event.target.value)) {
			event.target.value = props.dataPoints[props.clickedPointIdx].uncertainty
		}
		else {
			let newUncertainty = parseFloat(event.target.value)
			props.dataPoints[props.clickedPointIdx].uncertainty = newUncertainty
		}
	}

	const onEditTrajectoryClick = (event) => {
		props.setClickMode("trajectory");
	}

	const onFinishEditTrajectoryClick = (event) => {
		props.setClickMode("point");
	}

	const onClearTrajectoryClicked = (event) => {
		var tempDataPoints = [...props.dataPoints]
		while (tempDataPoints[props.clickedPointIdx].trajectories.length > 0) {
			tempDataPoints[props.clickedPointIdx].trajectories.pop();
		}
		props.setDataPoints(tempDataPoints)
	}

	const onDeletePointClicked = (event) => {
		var tempDataPoints = []
		for (let i = 0; i < props.dataPoints.length ; i ++) {
			if (i != props.clickedPointIdx) tempDataPoints.push(props.dataPoints[i])
		}
		console.log("tempDataPoints",tempDataPoints,props.clickedPointIdx)
		props.setClickedPointIdx(Math.max(0, props.clickedPointIdx - 1))
		props.setDataPoints(tempDataPoints)
	}

	useEffect(()=>{
		if (props.dataPoints.length != 0) document.getElementById("speed-input").value = props.dataPoints[props.clickedPointIdx].speed
	}, [props.clickedPointIdx])

	useEffect(()=>{
		if (props.dataPoints.length != 0) document.getElementById("point_uncertainty-input").value = props.dataPoints[props.clickedPointIdx].uncertainty
	}, [props.clickedPointIdx])

	return (
		<>
			<h3>Edit Point</h3>
			{
				(props.dataPoints.length != 0) ?
				<>
					<Row>
						<Col>
							Coordinate
						</Col>
						<Col>
							[{props.dataPoints[props.clickedPointIdx].x},{props.dataPoints[props.clickedPointIdx].y}]
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
							Point Uncertainty
						</Col>
						<Col>
							<input id="point_uncertainty-input" type="text" onBlur={onPointUncertaintyInputChanged} defaultValue={props.dataPoints[props.clickedPointIdx].uncertainty}></input>
						</Col>
					</Row>
					<Row>
						<Col md="auto">
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
						<Col md="auto">
							<button onClick={onClearTrajectoryClicked}>Clear Trajectory</button>
						</Col>
						<Col md="auto">
							<button onClick={onDeletePointClicked}>Delete Point</button>
						</Col>
						<Col md="auto">
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
	var [mode, setMode] = useState("edit") // edit, play, pause

	useEffect(()=>{
		console.log("dataPoints", dataPoints)
	},[dataPoints])

	return (
		<div class="mainbody">
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
						mode={mode}
					/>	
				</Col>
				<Col>
					<PointEditor
						dataPoints={dataPoints}
						setDataPoints={setDataPoints}
						clickedPointIdx={clickedPointIdx}
						setClickedPointIdx={setClickedPointIdx}
						clickMode={clickMode}
						setClickMode={setClickMode}
					/>
				</Col>
			</Row>
			<Row>
			`	<Col>
					<ControlPanel
						mode={mode}
						setMode={setMode}
					/>
				</Col>	
			</Row>
			<Row>
				<Col>
					<SvgSizeEditPanel 
						setWidthCallback={setWidth}
						setHeightCallback={setHeight}
					/>
				</Col>	
			</Row>	
			
		</div>
	)
}