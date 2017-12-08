import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule, MatButtonModule, MatCardModule, MatMenuModule, MatToolbarModule, MatIconModule } from '@angular/material';

import { AppComponent, DialogAbout } from './app.component';
import { DialogConfirm } from './radar/radar.component';
import { RadarComponent } from './radar/radar.component';


@NgModule({
  declarations: [
    AppComponent,
    DialogAbout,
    DialogConfirm,
    RadarComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatToolbarModule,
    MatIconModule
  ],
  entryComponents: [DialogAbout, DialogConfirm],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
