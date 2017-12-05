import { Component } from '@angular/core';
import { MatDialog } from '@angular/material';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'GeoTag'

  constructor(private dialog: MatDialog) {}

  about() {
    this.dialog.open(DialogAbout,
      {
        height: '400px',
        width: '600px',
      }
    )
  }  

}

@Component({
  selector: 'dialog-about',
  templateUrl: 'dialog-about.html',
  styles: [],
})
export class DialogAbout {

  constructor() {}

}
