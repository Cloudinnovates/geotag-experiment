import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-radar',
  template: `
  <div align="center" style="margin-top: 10%">
    <canvas #radarCanvas width="300" height="300"></canvas>
    <canvas #readingCanvas width="300" height="125"></canvas>
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
  
  constructor() { }

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
    this.running = true
    //window.setInterval(() => this.paint(),10)
    this.paintRadar()
    this.paintReading()
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
    this.drawTarget(30, 0.75*innerRadius, this.targetFade)
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
    let ctx = this.rctx
    // Draw static
    this.paintReadingStatic()   
    // Draw frame
    // ---> lat/long + GPS signal + distance
    // Schedule next
   requestAnimationFrame(() => this.paintReadingStatic());
  }

  drawTarget(pos, dist, fade) {
    let ctx = this.ctx, radius = this.radius
    ctx.beginPath()
    ctx.strokeStyle= 'rgba(255, 0, 0, '+ (1-(fade*10)) +')'
    ctx.lineWidth = radius * 0.03
    ctx.rotate(pos+90)
    ctx.arc(0, -dist, radius * fade * 2, 0, 2*Math.PI)
    ctx.stroke()
    ctx.rotate(-(pos+90))
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
    this.paintGpsSignalStrength(6.5)
    ctx.font = "20px Courier"
    ctx.fillStyle = 'lightgreen'
    ctx.fillText('Latitude : 51.725342', readingW*0.056, readingH*0.22)
    ctx.fillText('Longitude:  5.225331', readingW*0.056, readingH*0.42)
  }

  paintGpsSignalStrength(strength) {
    let ctx = this.rctx, readingH = this.readingH, readingW = this.readingW
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
  }

  ngOnDestroy(): void {
    this.running = false
  }

}
