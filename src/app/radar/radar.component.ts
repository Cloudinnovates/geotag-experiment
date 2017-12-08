import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { MatDialog } from '@angular/material';

@Component({
  selector: 'app-radar',
  template: `
  <div align="center" width="300" style="margin-top: 10%">
    <canvas #radarCanvas width="300" height="300"></canvas>
    <canvas #readingCanvas width="300" height="125"></canvas>
    <button mat-raised-button color="primary" style="margin-top: 15px" (click)="tag()">Markeer huidige locatie</button>
  </div>
  `,
  styles: []
})
export class RadarComponent implements OnInit, OnDestroy {
  @ViewChild('radarCanvas') canvasRef: ElementRef
  @ViewChild('readingCanvas') rcanvasRef: ElementRef
  private running: boolean
  private ctx: CanvasRenderingContext2D
  private rctx: CanvasRenderingContext2D
  bevel = 0.1; padding = 0.9
  sweepSize = 2; sweepSpeed = 1.2; sweepAngle = 0
  centerX = 0; centerY = 0 
  radius = 0; innerRadius = 0; targetFade = 0
  readingH = 0; readingW = 0

  OrientationSupported = false; heading = 0
  watchId = 0; lat = 0; long = 0; accuracy = 0
  ttt = '>'
  initialOffset = null; iosCompass = false
  tagLat = 0; tagLong = 0; targetBearing = 0; targetDistance = 100000

  constructor(private dialog: MatDialog) { }

  ngOnInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')
    this.rctx = this.rcanvasRef.nativeElement.getContext('2d')
    this.readingH = this.rcanvasRef.nativeElement.height
    this.readingW = this.rcanvasRef.nativeElement.width
    this.ctx.fillStyle = "black"
    this.rctx.fillStyle = "black"
    this.ctx.fillRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    this.rctx.fillRect(0, 0, this.rcanvasRef.nativeElement.width, this.rcanvasRef.nativeElement.height);
    this.radius = (this.canvasRef.nativeElement.height / 2)
    this.centerX = this.radius
    this.centerY = this.radius
    this.radius = this.radius * this.padding
    this.innerRadius = (1-(this.bevel/2))*this.radius
    this.ctx.translate(this.centerX, this.centerY)
    this.setEventHandlers()
    this.watchId = navigator.geolocation.watchPosition(_position => this.positionResults(_position), _error => console.log(_error), {enableHighAccuracy:true,timeout:60000,maximumAge:0})
    this.running = true
    //window.setInterval(() => this.paint(),10)
    this.paintRadar()
    this.paintReading()
  }

  tag() {
    if(this.tagLat){
      if(this.lat){
        this.dialog.open(DialogConfirm, {height: '200px', width: '400px'}).afterClosed().toPromise().then(v => {if(v=='confirmed'){
          this.tagLat = this.lat
          this.tagLong = this.long
        }})
      }
    } else {
      this.tagLat = this.lat
      this.tagLong = this.long
    }
  }

  setEventHandlers() {
    if('ondeviceorientationabsolute' in window){
      this.OrientationSupported = true
      window.addEventListener('deviceorientationabsolute', (event: any) => {
          if(event.webkitCompassAccuracy !== undefined && event.webkitCompassAccuracy !== null){
              this.heading = event.webkitCompassHeading
          } else {
              var o = this.usefulOrientation(event.alpha, event.beta, event.gamma)
              this.heading = o.alpha
              // this.log('b', this.heading, 'q', 'q')
          }
      }, false);
    } else {
      if('ondeviceorientation' in window){
          this.OrientationSupported = true
          window.addEventListener('deviceorientation', (event: any) => {
              if(event.webkitCompassAccuracy !== undefined && event.webkitCompassAccuracy !== null){
                  this.iosCompass = true
                  if(this.initialOffset === null && event.absolute !== true && +event.webkitCompassAccuracy > 0 && +event.webkitCompassAccuracy < 50) {
                    this.initialOffset = event.webkitCompassHeading || 0
                  }
                  let alpha = event.alpha - this.initialOffset
                  if(alpha < 0) {
                    alpha += 360
                  }
                  this.heading = alpha
                  // this.log('a', this.heading, this.initialOffset, 'q')
              } else {
                  var o = this.usefulOrientation(event.alpha, event.beta, event.gamma)
                  this.heading = o.alpha                
              }
          }, false);
      }
    }    
  }

  log(p1, p2, p3, p4) {
    this.ttt = '<' + p1 + '*' + p2 + '*' + p3 + '*' + p4 + '>'
  }

  usefulOrientation(alpha: number = 0, beta: number = 0, gamma: number = 0) {
    alpha -= +window.orientation
    while(alpha < 0) alpha += 360;
    while(alpha > 360) alpha -= 360;
    if(window.orientation === 180){
        return {alpha: alpha,
            beta: -beta,
            gamma: -gamma};
    }else if(window.orientation === 90){
        return {alpha: alpha,
            beta: -gamma,
            gamma: beta};
    }else if(window.orientation === -90){
        return {alpha: alpha,
            beta: gamma,
            gamma: -beta};
    }else{
        return {alpha: alpha,
            beta: beta,
            gamma: gamma};
    }
  }

  positionResults(position: Position) {
    if (!this.running) {return}
    this.lat = position.coords.latitude
    this.long = position.coords.longitude
    this.accuracy = position.coords.accuracy
    this.updateTarget()
  }

  updateTarget() {
    if(this.accuracy>0 && this.tagLat){
      this.targetBearing = this.getRhumbLineBearing(this.lat, this.long, this.tagLat, this.tagLong)
      this.targetDistance = this.getDistance(this.lat, this.long, this.tagLat, this.tagLong)
    }
  }

  getRhumbLineBearing(origLat, origLong, destLat, destLong) {
    let PI_DIV4 = Math.PI / 4;
    let PI_X2 = Math.PI * 2;
    // difference of longitude coords
    var diffLon = (destLong * (Math.PI / 180)) - (origLong * (Math.PI / 180));
    // difference latitude coords phi
    var diffPhi = Math.log(
        Math.tan(
            (destLat * (Math.PI / 180)) / 2 + PI_DIV4
        ) /
        Math.tan(
            (origLat * (Math.PI / 180)) / 2 + PI_DIV4
        )
    );
    // recalculate diffLon if it is greater than pi
    if(Math.abs(diffLon) > Math.PI) {
        if(diffLon > 0) {
            diffLon = (PI_X2 - diffLon) * -1;
        }
        else {
            diffLon = PI_X2 + diffLon;
        }
    }
    //return the angle, normalized
    return ((Math.atan2(diffLon, diffPhi) * (180 / Math.PI)) + 360) % 360;
  }

  getDistance(startLat, startLong, endLat, endLong) {
    let accuracy = 1
    var distance =
        Math.round(
            Math.acos(
                Math.sin(
                    endLat.toRad()
                ) *
                Math.sin(
                    startLat.toRad()
                ) +
                Math.cos(
                    endLat.toRad()
                ) *
                Math.cos(
                    startLat.toRad()
                ) *
                Math.cos(
                    startLong.toRad() - endLong.toRad()
                )
            ) * this.radius
        );
    return Math.floor(distance);
  }

  private paintRadar() {
    if (!this.running) {return}
    let ctx = this.ctx, innerRadius = this.innerRadius
    this.targetFade += 0.001
    if(this.targetFade > 0.09) this.targetFade = 0.01
    // Draw static
    this.paintRadarStatic()   
    // Draw frame
    // ---> marked position
    if(this.tagLat){
      this.drawTarget((this.heading + this.targetBearing)*(Math.PI/180), this.targetDistance, this.targetFade)      
    }
    if(this.iosCompass && this.initialOffset === null && this.sweepAngle%30 > 10){
      ctx.font = "10px Courier"
      ctx.fillStyle = 'lightgreen'  
      ctx.fillText('Compass is calibrating...', -0.5*innerRadius, 0.25*innerRadius)      
    }
    if(this.lat == 0 && this.sweepAngle%30 > 10){
      ctx.font = "10px Courier"
      ctx.fillStyle = 'lightgreen'  
      ctx.fillText('Finding GPS satellites...', -0.5*innerRadius, 0.5*innerRadius)      
    }
    // Draw sweep
    ctx.save()
    this.sweepAngle += 1
    ctx.globalCompositeOperation = 'lighter'
    let gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius);
    gradient.addColorStop(0,'hsla(120, 50%, 40%, 0.1)')
    gradient.addColorStop(1,'hsla(170, 50%, 40%, 0.1)')
    for (let i = 0; i < 20; i=i+1) {
      ctx.beginPath()
      ctx.moveTo( 0, 0 )
      ctx.arc( 0, 0, this.innerRadius, this.dToR( this.sweepAngle+(30-i) ), this.dToR( this.sweepAngle+30 ), false )
      ctx.fillStyle = gradient
      ctx.fill()  
    }
    // Schedule next
    requestAnimationFrame(() => this.paintRadar());
  }

  private paintReading() {
    if (!this.running) {return}
    let ctx = this.rctx, readingW = this.readingW, readingH = this.readingH
    // Draw static
    this.paintReadingStatic()
    // Draw frame
    // ---> lat/long + GPS signal + distance
    this.paintGpsSignalStrength(this.accuracy)
    // ctx.font = "10px Courier" // for debugging
    ctx.font = "18px Courier"
    ctx.fillStyle = 'lightgreen'
    ctx.fillText(('Latitude : '+this.lat).slice(0,25), readingW*0.056, readingH*0.22)
    // ctx.fillText(this.accuracy+'', readingW*0.056, readingH*0.32) //for debugging
    ctx.fillText(('Longitude: '+this.long).slice(0,25), readingW*0.056, readingH*0.42)
    // Schedule next
   requestAnimationFrame(() => this.paintReading());
  }

  drawTarget(pos, dist, fade) {
    let ctx = this.ctx, radius = this.radius
    if(dist>50){
      // debugger
      ctx.fillStyle= 'rgba(255, 0, 0, '+ (1-(fade*10)) +')'
      // ctx.lineWidth = radius * 0.02
      ctx.rotate(pos+0)
      ctx.beginPath()
      ctx.moveTo(0, -0.85*radius)
      ctx.lineTo(radius*0.1, -0.85*radius+(radius*0.1))
      ctx.lineTo(-radius*0.1, -0.85*radius+(radius*0.1))
      // ctx.lineTo(0, -0.85*radius)
      ctx.fill()
      // ctx.stroke()
      ctx.rotate(-(pos+0))  
    } else {
      ctx.beginPath()
      ctx.strokeStyle= 'rgba(255, 0, 0, '+ (1-(fade*10)) +')'
      ctx.lineWidth = radius * 0.03
      ctx.rotate(pos+0)
      ctx.arc(0, -(0.85/50)*dist, radius * fade * 2, 0, 2*Math.PI)
      ctx.stroke()
      ctx.rotate(-(pos+0))  
    }
  }

  dToR = function( degrees ){ 
    return degrees * (Math.PI / 180)
  }

  paintRadarStatic() {
    let ctx = this.ctx, radius = this.radius, innerRadius = this.innerRadius, bevel = this.bevel
    ctx.globalCompositeOperation = 'source-over'
    //rim instrument box
    ctx.strokeStyle = '#333'
    ctx.lineWidth = radius*0.02
    ctx.rect(-radius*1.08, -radius*1.08, 2*radius*1.08, 2*radius*1.08)
    ctx.stroke()
    //inner dial
    ctx.beginPath()
    ctx.arc(0, 0, innerRadius, 0, 2*Math.PI)
    ctx.fillStyle = '#333'
    ctx.fill()
    //dial bevel
    let grad = ctx.createRadialGradient(0,0,innerRadius*(1-(bevel/2)), 0,0,innerRadius*(1+(bevel/2)))
    grad.addColorStop(0, '#333')
    grad.addColorStop(0.5, 'white')
    grad.addColorStop(1, '#333')
    ctx.strokeStyle = grad
    ctx.lineWidth = radius*0.1
    ctx.stroke()
    //screws
    this.paintScrew(-1, -1)
    this.paintScrew(+1, -1)
    this.paintScrew(-1, +1)
    this.paintScrew(+1, +1)
    //circles
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)'
    ctx.lineWidth = radius*0.01
    for (let i = 0.2; i < 1; i=i+0.2) {
      ctx.beginPath()
      ctx.arc(0, 0, radius*i, 0, 2*Math.PI)
      ctx.stroke()
    }
    //axes
    ctx.beginPath()
    ctx.lineWidth = radius*0.01
    ctx.moveTo(0,innerRadius)
    ctx.lineTo(0, -innerRadius)
    ctx.stroke()
    ctx.beginPath()
    ctx.rotate(0.5*Math.PI);
    ctx.moveTo(0,innerRadius)
    ctx.lineTo(0, -innerRadius)
    ctx.stroke()
    ctx.rotate(-0.5*Math.PI);
  }

  paintScrew(x, y) {
    let ctx = this.ctx, radius = this.radius
    ctx.beginPath()
    ctx.strokeStyle = 'rgb(191, 191, 191)'
    ctx.lineWidth = radius*0.03
    ctx.arc(x*(radius*0.95), y*(radius*0.95), radius*0.03, 0, 2*Math.PI)
    ctx.stroke()    
    ctx.beginPath()
    ctx.strokeStyle = 'gray'
    ctx.arc(x*(radius*0.95), y*(radius*0.95), radius*0.03, 0.25*Math.PI, 1.25*Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.strokeStyle = 'black'
    ctx.lineWidth = radius*0.005
    ctx.arc(x*(radius*0.95), y*(radius*0.95), radius*0.03, 0.25*Math.PI, 1.25*Math.PI)
    ctx.stroke()    
  }

  paintReadingStatic() {
    let ctx = this.rctx, readingH = this.readingH, readingW = this.readingW, bevel = this.bevel
    ctx.globalCompositeOperation = 'lighter'
    //rim instrument box
    ctx.strokeStyle = '#333'
    ctx.lineWidth = readingW*0.012
    ctx.strokeRect(0+(readingW*0.012),0+(readingH*0.032),readingW-(readingW*0.024), readingH-(readingH*0.064))
    //inner dials
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#333'
    ctx.fillRect(readingW*0.04,0+(readingH*0.08),readingW-(readingW*0.08), readingH*0.4)
    ctx.fillStyle = 'lightgray'
    ctx.strokeStyle = 'lightgray'
    ctx.lineWidth = readingW*0.006
    ctx.strokeRect(readingW*0.04,0+(readingH*0.08),readingW-(readingW*0.08), readingH*0.4)
    ctx.font = '10px sans-serif'
    ctx.fillText('GPS Signal Strength', readingW*0.04, readingH*0.6)
    ctx.fillRect(readingW*0.04,0+readingH*0.62,readingW-(readingW*0.08), readingH*0.3)
  }

  paintGpsSignalStrength(accuracy) {
    let ctx = this.rctx, readingH = this.readingH, readingW = this.readingW, strength = 0
    if(accuracy){
      if(accuracy >=20) strength = 1;
      if(accuracy < 20) strength = 2;
      if(accuracy < 15) strength = 3;
      if(accuracy < 12) strength = 4;
      if(accuracy < 10) strength = 5;
      if(accuracy <  8) strength = 6;
      if(accuracy <  6) strength = 7;
      if(accuracy <  4) strength = 8;
      if(accuracy <  2) strength = 9;
      ctx.strokeStyle = 'gray'
      ctx.lineWidth = 4
      for (let i = 0; i < 9; i+=1) {      
        ctx.strokeRect((readingW*0.059)+((readingW/10)*i), 0+readingH*0.65, (readingW/10)*0.80, (readingH*0.24))
      }
      ctx.fillStyle = 'red'
      ctx.lineWidth = 4
      for (let i = 1; i < 10; i+=1) {
        if(i>2) ctx.fillStyle = 'orange'
        if(i>4) ctx.fillStyle = 'lightgreen'
        if(i>6) ctx.fillStyle = 'green'
        if(i>strength) ctx.fillStyle = 'white'
        ctx.fillRect((readingW*0.059)+((readingW/10)*(i-1)), 0+readingH*0.65, (readingW/10)*0.80, (readingH*0.24))
      }  
    } else {
      ctx.fillStyle = 'black'
      ctx.fillRect(readingW*0.04,0+readingH*0.62,readingW-(readingW*0.08), readingH*0.3)
      ctx.font = '15px sans-serif'
      ctx.fillStyle = 'lightgreen'
      ctx.fillText('Signal too weak (searching...)', readingW*0.17, readingH*0.8)
    }
  }

  ngOnDestroy(): void {
    navigator.geolocation.clearWatch(this.watchId)
    this.running = false
  }

}

@Component({
selector: 'dialog-confirm',
template: `
<h2 mat-dialog-title style="background-color:lightgray" align="center">Bevestiging</h2>
<mat-dialog-content>
    <div align="center">
        <h3 class="mat-body-1">Bestaande markering wordt overschreven, doorgaan?</h3>
    </div>
</mat-dialog-content>
<mat-dialog-actions align="center">
  <button mat-button mat-dialog-close tabindex="-1">Annuleer</button>
  <button mat-button [mat-dialog-close]="'confirmed'" tabindex="-1">Overschrijf</button>
</mat-dialog-actions>
` 
})
export class DialogConfirm {

constructor() {}

}
