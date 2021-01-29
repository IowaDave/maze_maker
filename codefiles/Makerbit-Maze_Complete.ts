/******************************************************
 * maze for MakerBit 
 * by David G Sparks  January 2021 
 * Version 0.5 24Jan2021
 * Requires:
 *    BBC micro:bit version 1 or later 
 *    MakerBit by Roger Wagner 
 *    MakeCode editor 
 *    MakeCode extension: "makerbit-touch"
 * Connect 1 LED to digital pin P16 
 * Connect and label touchpins 5 through 10 as follows:
 * 5 = new game request 
 * 6 = move up 
 * 7 = move left 
 * 8 = move right 
 * 9 = move down 
 * 10 = toggle breadcrumb display 
 * 
 * Select number of rows in maze with micro:bit button A 
 * Select number of columns with micro:bit button B 
 ********************************************************/

// The main program loop responds to event flags 
basic.forever(function () {
	if (setRowRequest) {
        handleSetRowRequest();
    }
    if (setColRequest) {
        handleSetColRequest();
    }
    if (newGameRequest) {
        startNewGame();
        gameUnderway = true;
    }
    if (gameUnderway) {
        if (pinUp) {
            moveUp(cellRow, cellCol);
        }
        if (pinLeft) {
            moveLeft(cellRow, cellCol);
        }
        if (pinRight) {
            moveRight(cellRow, cellCol);
        }
        if (pinDown) {
            moveDown(cellRow, cellCol);
        }
        if (showCrumbs) {
            pins.digitalWritePin(DigitalPin.P16, 1);
        } else {
            pins.digitalWritePin(DigitalPin.P16, 0);
        }
    }
})

/**
 * Startup instructions
 */

pins.digitalWritePin(DigitalPin.P16, 0); // turn off external LED


/*****************************************************************
 * global facts about the game 
 *****************************************************************/

let gameUnderway = false; // at startup
let newGameRequest = false; // at startup 
// some boolean flags for the touchpins to toggle
// indicating direction player desires to move
let pinUp = false;
let pinLeft = false;
let pinRight = false;
let pinDown = false; 
// some boolean flags for microbit button activation 
let showingRows = false; // true when displaying mazeROWS value 
let showingCols = false; // true when displaying mazeCOLS value 
let setRowRequest = false; // display or change number of rows
let setColRequest = false; // display or change number of columns
// flag relating to display
let showCrumbs = false; // default to not show breadcrumbs 

/******************************************************************
 * facts about the maze 
 ******************************************************************/
let maze: Buffer; // to be defined later
let mazeCOLS = 2; // default
let mazeROWS = 2; // default

// calculates an index number into the maze buffer,
// from a pair of row and column numbers
function index (row: number, col: number) {
  return (row * mazeCOLS) + col;
}

/**
 * constants for defining and analyzing maze contents
 */
const LEFTLINE = 1;
const TOPLINE = 2;
const RIGHTLINE = 4;
const BOTTOMLINE = 8;
const VISITFLAG = 16;

/*******************************************************************
 * facts about a cell
 *******************************************************************/
let cellRow = 0;
let cellCol = 0;

/**
 * cellValue returns the value stored
 * at row,col of a maze
 */
function cellValue (row: number, col: number): number {
    return maze.getNumber(NumberFormat.Int8LE, 
                    index(row, col)); 
}

/**
 * hasTopBoundary
 * return true if cell at (row, col) has a top boundary
 */
function hasTopBoundary(row: number, col: number): boolean {
    // true if cell is Entrance 
    if (isEntrance(row, col)) return true;
    // true if cell is Exit 
    if (isExit(row, col)) return true;
    // true if cell defines a TOPLINE 
    if ((cellValue(row, col) & TOPLINE) != 0)  return true;
    // otherwise
    return false;
    
}

/**
 * hasLeftBoundary
 * return true if cell at (row, col) has a left boundary
 */
function hasLeftBoundary(row: number, col: number): boolean {
    // true if cell is Entrance 
    if (isEntrance(row, col)) return true;
    // true if cell defines a LEFTLINE 
    if ((cellValue(row, col) & LEFTLINE) != 0) return true;
    // otherwise
    return false;
}

/**
 * hasRightBoundary
 * return true if cell at (row, col) has a right boundary
 */
function hasRightBoundary(row: number, col: number): boolean {
    // true if cell is Exit 
    if (isExit(row, col)) return true;
    // true if cell defines a RIGHTLINE 
    if ((cellValue(row, col) & RIGHTLINE) != 0) return true;
    // true if the column number to the right is in the maze
    // and the cell in that column on this row defines a LEFTLINE
    if (((col + 1) < mazeCOLS) 
        && ((cellValue(row, col + 1) & LEFTLINE) != 0)) return true;
    // otherwise
    return false;
}

/**
 * hasBottomBoundary
 * return true if cell at (row, col) has a bottom boundary
 */
function hasBottomBoundary(row: number, col: number): boolean {
    // true if cell is Entrance 
    if (isEntrance(row, col)) return true;
    // true if cell is Exit 
    if (isExit(row, col)) return true;
    // true if cell defines a BOTTOMLINE 
    if ((cellValue(row, col) & BOTTOMLINE) != 0) return true;
    // true if the row number below is in the maze 
    // and the cell in this column on that row defines a TOPLINE 
    if (((row + 1) < mazeROWS)
        && ((cellValue(row+1, col) & TOPLINE) != 0)) return true;
    // otherwise
    return false;
}

function hasBreadcrumb(row: number, col:number): boolean {
    // true if cell's VISITFLAG is turned off 
    // I know, that sounds backwards.
    // The reason is that we're re-using a flag
    // that was turned on when the maze was being initialized.
    // During play, the flag is off for cells that have been visited
    if ((cellValue(row, col) & VISITFLAG) == 0) return true;
    // otherwise
    return false;
}

function isExit(row: number, col: number): boolean {
    // true if on bottom row and to the right of rightmost cell
    if ((row == mazeROWS - 1) && (col >= mazeCOLS)) return true;
    // otherwise
    return false;
}

function isEntrance(row: number, col: number) {
    // true if on row 0 and col is -1
    if ((row == 0) && (col < 0)) return true;
    // otherwise
    return false;
}

/*****************************************************************
 * player input actions that set flags 
 * requires extension: makerbit-touch 
 *****************************************************************/
// touchpin 5 is labeled "New" on the game controller
makerbit.onTouch(TouchSensor.T5, TouchAction.Touched, function () {
    newGameRequest = true;
});

// touchpin 6 is labeled "Up" on the game controller
makerbit.onTouch(TouchSensor.T6, TouchAction.Touched, function () {
    pinUp = true;
});

// touchpin 7 is labeled "Left" on the game controller 
makerbit.onTouch(TouchSensor.T7, TouchAction.Touched, function () {
    pinLeft = true;
});

// touchpin 8 is labeled "Right" on the game controller
makerbit.onTouch(TouchSensor.T8, TouchAction.Touched, function () {
    pinRight = true;
});

// touchpin 9 is labeled "Down" on the game controller
makerbit.onTouch(TouchSensor.T9, TouchAction.Touched, function () {
    pinDown = true;
});

// touchpin 10 is labeled "Breadcrumbs" on the game controller
makerbit.onTouch(TouchSensor.T10, TouchAction.Touched, function () {
    showCrumbs = !showCrumbs; // toggle it
});

/*****************************************************************
 * manage movement from one cell to the next 
 *****************************************************************/

// checkCrumb checks for and drops breadcrumb when departing a cell
function checkCrumb(row: number, col: number) {
    if (hasBreadcrumb(row, col)) {
        // the VISITFLAG is already clear; do nothing 
    } else {
        // clear the VISITFLAG
        maze.setNumber(NumberFormat.Int8LE, 
            index(row, col), 
            cellValue(row, col) ^ VISITFLAG);
    }
}

// moveUp is called from the main loop when pinUp flag is true 
function moveUp(row: number, col: number) {
    pinUp = false;
    if (hasTopBoundary(row, col)) {
        flashTopLine();
    } else {
        checkCrumb(row, col);
        arrowsUp();
        cellRow--;
        displayCell(cellRow, cellCol);
    }
}

// moveLeft is called from the main loop when pinLeft flag is true 
function moveLeft(row: number, col: number) {
    pinLeft = false;
    if (hasLeftBoundary(row, col)) {
        flashLeftLine();
    } else {
        checkCrumb(row, col);
        arrowsLeft();
        cellCol--;
        displayCell(cellRow, cellCol);
    }
}

// moveRight is called from the main loop when pinRight flag is true
function moveRight(row: number, col: number) {
    pinRight = false;
    if (hasRightBoundary(row, col)) {
        flashRightLine();
    } else {
        checkCrumb(row, col);
        arrowsRight(); 
        cellCol++;
        displayCell(cellRow, cellCol);
    }
}

//moveDown is called from the main loop when pinDown flag is true 
function moveDown(row: number, col: number) {
    pinDown = false;
    if (hasBottomBoundary(row, col)) {
        flashBottomLine();
    } else {
        checkCrumb(row, col);
        arrowsDown(); 
        cellRow++;
        displayCell(cellRow, cellCol);
    }
}

/************************************************************
 * maze motion indicators                                   *
 *   these functions animate a pair of arrowheads           *
 *   moving in the named direction across the LED display   *
 ************************************************************/
let dwellTime = 80; // animation speed, smaller = faster

function arrowsLeft () {
    basic.clearScreen();
    for (let x = 10; x > 0; x--) {
        shift2ByCol(x-5, x-6);
        shift13ByCol(x-4, x-5);
        shift2ByCol(x-2, x-3);
        shift13ByCol(x-1, x-2);
        basic.pause(dwellTime);
    }
}

function arrowsUp () {
    basic.clearScreen();
    for (let x = 10; x > 0; x--) {
        shift2ByRow(x-5, x-6);
        shift13ByRow(x-4, x-5);
        shift2ByRow(x-2, x-3);
        shift13ByRow(x-1, x-2);
        basic.pause(dwellTime);
    }
}

function arrowsRight () {
    basic.clearScreen();
    for (let x = 0; x < 10; x++) {
        shift2ByCol(x-1, x);
        shift13ByCol(x-2, x-1);
        shift2ByCol(x-4, x-3);
        shift13ByCol(x-5, x-4);
        basic.pause(dwellTime);
    }
}

function arrowsDown () {
    basic.clearScreen();
    for (let x = 0; x < 10; x++) {
        shift2ByRow(x-1, x);
        shift13ByRow(x-2, x-1);
        shift2ByRow(x-4, x-3);
        shift13ByRow(x-5, x-4);
        basic.pause(dwellTime);
    }
}

/*******************************************************
 * shift2ByRow turns off the LED in column 2 of a row  *
 * and turns the same position on in an adjacent row.  *
 *******************************************************/
function shift2ByRow (prior: number, next: number) {
    // turn off the dot in column 2 of the prior row 
    if ((prior >= 0) && (prior < 5)) led.unplot(2, prior);
    // turn  on the dot in column two of the next row 
    if ((next >= 0) && (next < 5)) led.plot(2, next);
}

/****************************************************************
 * shift13ByRow turns off the LEDs in columns 1 and 3 of a row  *
 * and turns the same positions on in an adjacent row.          *
 ****************************************************************/
function shift13ByRow (prior: number, next: number) {
    if ((prior >= 0) && (prior < 5)) {
    // turn off the dots in columns 1 and 3 of the prior row     
        led.unplot(1, prior);
        led.unplot(3, prior);
    }
    if ((next >= 0) && (next < 5)) {
    // turn on the dots in columns 1 and 3 of the next row 
        led.plot(1, next);
        led.plot(3, next);
    }
}

/**********************************************************
 * shift2ByCol turns off the LED in row 2 of a column     *
 * and turns the same position on in an adjacent column.  *
 **********************************************************/
function shift2ByCol (prior: number, next: number) {
    // turn off the dot in row 2 of the prior column 
    if ((prior >= 0) && (prior < 5)) led.unplot(prior, 2);
    // turn on the dot in row 2 of the next column 
    if ((next >= 0) && (next < 5)) led.plot(next, 2);
}

/***************************************************************
 * shift13ByCol turns off the LEDs in rows 1 and 3 of a column *
 * and turns the same positions on in an adjacent column.      *
 ***************************************************************/
function shift13ByCol (prior: number, next: number) {
    if ((prior >= 0) && (prior < 5)) {
    // turn off the dots in rows 1 and 3 of the prior column 
        led.unplot(prior, 1);
        led.unplot(prior, 3);
    }
    if ((next >= 0) && (next < 5)) {
    // turn on the dots in rows 1 and 3 of the next column 
        led.plot(next, 1);
        led.plot(next, 3);
    }
}

 /****************************************************************
  * display functions for the current cell
  ****************************************************************/
function displayCell(row: number, col: number) {
    outlineCell();
    // fill-in applicable edge lines
    if (hasLeftBoundary(row, col)) drawLeftLine();
    if (hasTopBoundary(row, col)) drawTopLine();
    if (hasRightBoundary(row, col)) drawRightLine();
    if (hasBottomBoundary(row, col)) drawBottomLine();
    // show breadcrumbs if flag enabled
    if (showCrumbs && hasBreadcrumb(row, col)) {
        led.plot(2,2);
    } else {led.unplot(2,2)} // turn crumbs off otherwise 
    // don't show a breadcrumb at Entry and Exit locations 
    if (isEntrance(row, col)) {
        drawEntryBar();
        led.unplot(2,2);
    }
    if (isExit(row, col)) {
        drawExitBar();
        led.unplot(2,2);
    }
}

function outlineCell() {
    basic.clearScreen();
    led.plot(0,0);
    led.plot(0,4);
    led.plot(4,0);
    led.plot(4,4);
}

function drawLeftLine() {
    led.plot(0,1);
    led.plot(0,2);
    led.plot(0,3);
}

function drawRightLine() {
    led.plot(4,1);
    led.plot(4,2);
    led.plot(4,3);
}

function drawTopLine() {
    led.plot(1,0);
    led.plot(2,0);
    led.plot(3,0);
}

function drawBottomLine() {
    led.plot(1,4);
    led.plot(2,4);
    led.plot(3,4);
}

function drawEntryBar() {
    led.plot(1,1);
    led.plot(1,2);
    led.plot(1,3);
}

function drawExitBar() {
    led.plot(3,1);
    led.plot(3,2);
    led.plot(3,3);
}

// the following functions flash a boundary line

function flashLeftLine() {
    for (let count = 0; count < 6; count++) {
        led.toggle(0,0);
        led.toggle(0,1);
        led.toggle(0,2);
        led.toggle(0,3);
        led.toggle(0,4);
        basic.pause(100);
    }
}

function flashTopLine() {
    for (let count = 0; count < 6; count++) {
        led.toggle(0,0);
        led.toggle(1,0);
        led.toggle(2,0);
        led.toggle(3,0);
        led.toggle(4,0);
        basic.pause(100);
    }
}

function flashRightLine() {
    for (let count = 0; count < 6; count++) {
        led.toggle(4,0);
        led.toggle(4,1);
        led.toggle(4,2);
        led.toggle(4,3);
        led.toggle(4,4);
        basic.pause(100);
    }
}

function flashBottomLine() {
    for (let count = 0; count < 6; count++) {
        led.toggle(0,4);
        led.toggle(1,4);
        led.toggle(2,4);
        led.toggle(3,4);
        led.toggle(4,4);
        basic.pause(100);
    }
}

/*****************************************************************
 * Manage user inputs for desired numbers of rows and columns
 * for the next game. The setters are called from the main loop.
 *****************************************************************/
input.onButtonPressed(Button.A, function () {
    setRowRequest = true;
});
input.onButtonPressed(Button.B, function () {
    setColRequest = true;
})

function handleSetRowRequest() {
        // turn of the flag that activated this function
        setRowRequest = false;
        // turn off display flag for column count
        showingCols = false;
        // end current game, if any
        gameUnderway = false;
        // turn off breadcrumb display flag
        showCrumbs = false;
        // turn off breadcrumb status LED 
        pins.digitalWritePin(DigitalPin.P16, 0);
        // increment mazeROWS value if showing it already
        if (showingRows) {
            mazeROWS++;
            if (mazeROWS > 9) mazeROWS = 2;
        } else {
            // otherwise, enable showing the value
            showingRows = true;
        }
    // show the number of rows on the LED display
    basic.showNumber(mazeROWS);
}

function handleSetColRequest() {
        // turn off the flag that activated this function 
        setColRequest = false;
        // turn off display flag for row count
        showingRows = false;
        // end current game, if any
        gameUnderway = false;
        // stop showing breadcrumbs
        showCrumbs = false;
        // turn off breadcrumb status LED
        pins.digitalWritePin(DigitalPin.P16, 0);
        // increment mazeCOLS value if showing it already 
        if (showingCols) {
            mazeCOLS++;
            if (mazeCOLS > 9) mazeCOLS = 2;
        } else {
            // otherwise enable showing the value 
            showingCols = true;
        }
    // display the number of columns on the LED display
    basic.showNumber(mazeCOLS);
}

/***************************************************************
 * The following relate to creating a new maze 
 * having mazeROWS rows and mazeCOLS columns 
 ***************************************************************/
    // random-number generator returns 0 or 1
    // used below in makeMaze() function
    function rand01() {
      let randByte = 0;
    	if (Math.random() >= 0.5) {
    		randByte = 1;
	    }
      return randByte;
    }

function startNewGame() {
    // turn off the flag that activated this function
    newGameRequest = false;
    // turn off breadcrumb display 
    showCrumbs = false;
    // turn off the breadcrumb status LED 
    pins.digitalWritePin(DigitalPin.P16, 0);
    // create a new maze
    makeMaze();
    // place the player at the game entrance
    cellRow = 0;
    cellCol = -1;
    // display the entrance
    displayCell(cellRow, cellCol);
}

/****************************************************************
 * makeMaze													*
 * Applies the Aldus-Broder algorithm for discovering			*
 * uniform spanning trees within a rectangular matrix.  		*
 * See discussion in the following web pages:					*
 * http://weblog.jamisbuck.org/2011/1/17/...					*
 *      ...maze-generation-aldous-broder-algorithm				*
 * http://people.cs.ksu.edu/~ashley78/wiki.ashleycoleman.me/... *
 *      ...index.php/Aldous-Broder_Algorithm.html				*
 *																*
 * David Sparks Original c code written October 2019			*
 * Adapted January 2021 for MakeCode to run on a micro:bit 		*
 ****************************************************************/
function makeMaze() {
    // turn off new-game-related booleans
    showingRows = false;
    showingCols = false;
    // maze-creation variables
    /********************************************************************************* 
     * GENERAL INFORMATION ABOUT THE MAZE DATA STRUCTURE
     * The maze array is stored in a buffer of raw bytes, 
     * one byte per maze cell, in an effort to conserve RAM.
     * The one byte operates as a bitfield representing six distinct cell properties.
     * The buffer object is declared above with the name, maze.
     * It gets defined below, in the following sections.
     * The buffer's values are exposed by getter and setter methods,
     * getNumber() and setNumber().
     * The methods take a NumberFormat object as an argument.
     * We use the NumberFormat.Int8LE, representing 8-bit integers.
     * The methods also take an offset into the buffer.
     * Example, 10 rows of 5 cols gives 10 x 5 = a 50-byte buffer.
     * Its values may be accessed with an offset value of 0 through 49.
     * Translating offset from a row, column context requires calculation.
     * offset = (<row number> * <number of columns>) + <column number>.
     * This is handled by the index(row, col) function defined above.
     * Example of getting a value at row, col:
     * value = maze.getNumber(NumberFormat.Int8LE, index(row, col))
     * This code body gives a second way to get a cell's value, 
     * namely the cellValue(row, col) function defined above.
     *********************************************************************************/

    // Calculate number of cells from mazeROWS and mazeCOLS
    // as those values stand at the time this function gets run.
    // Note: 2 x 2 is the startup default but user may change.
    let unVisited = mazeROWS*mazeCOLS; 
  	// initialize maze buffer
    maze = pins.createBuffer(unVisited);
    // Set each and all cells to have a top line and a left line
    maze.fill(TOPLINE + LEFTLINE);

    /*********************************************************************************
     * I want to keep the program in row,col context as much as possible.
     * Because it is easier for me, a human, 
     * to read and understand the code that way.
     * The arrays for origin, destination, and motion
     * are regular Typescript numbers because it's easiest that way.
     *********************************************************************************/
    let origin = [0,0];  // [row, col]
    let destination = [0,0];
    let motion = [0,0];
    let row = 0;
    let col = 0;
    /****************************************************
    * The following section modifies the initial values
    * of certain cells in the buffer
    ****************************************************/

  	// turn off the left line on the upper-left cell
  	maze.setNumber(NumberFormat.Int8LE, 0, 
      maze.getNumber(NumberFormat.Int8LE, 0) ^ LEFTLINE);
  
  	// give bottom row of cells a bottom line
  	for (col = 0; col < mazeCOLS; col++) {
      /*********************************************************
       * (ROWS - 1) gives the row number of the bottom row
       * when counting from zero, as Javascript does for arrays.
       *********************************************************/
  		maze.setNumber(NumberFormat.Int8LE, index((mazeROWS - 1), col),
          cellValue((mazeROWS - 1), col) + BOTTOMLINE);
  	}
      
  	// Give the right-most column of cells a right side line
  	// except for the cell on the bottom row.
  	for (row = 0; row < mazeROWS - 1; row++) {
      /**********************************************************
       * COLS - 1 is the offset for the right-most cell of a row
       **********************************************************/
        maze.setNumber(NumberFormat.Int8LE, index(row, (mazeCOLS - 1)),
          cellValue(row, (mazeCOLS - 1)) + RIGHTLINE);
  	}
    /******************************************************************
    * The next section provides the method for navigating the buffer  
    ******************************************************************/

    /**************************************************************
     * The following steps for determing location within the maze
     * take place in row, col context. This is OK because
     * code calculates index into the cell array
     * at the moment of accessing the array.
     **************************************************************/
      
    // select random starting cell
  	origin[0] = Math.trunc(Math.random() * mazeROWS);
  	origin[1] = Math.trunc(Math.random() * mazeCOLS);
  	// mark it as visited
    // origin[0] is a row number, and origin[1] is a col number
    maze.setNumber(NumberFormat.Int8LE, index(origin[0], origin[1]),
       cellValue(origin[0], origin[1]) ^ VISITFLAG);
  	// decrement count of unvisited cells
  	unVisited -= 1;
/******************************* */
  	// visit all the other cells
  	while (unVisited > 0) {

  		// find a valid destination
  		do {
  			if (rand01() == 0) {
  				motion[0] = (rand01() * 2) - 1;
  				motion[1] = 0;
  			} else {
  				motion[0] = 0;
  				motion[1] = (rand01() * 2) - 1;
  			}
  			destination[0] = origin[0] + motion[0];
  			destination[1] = origin[1] + motion[1];
  		} while (
  			destination[0] < 0
  			|| destination[0] >= mazeROWS
  			|| destination[1] < 0
  			|| destination[1] >= mazeCOLS
  		);      

  		// test destination for visited
        if ((cellValue( destination[0], destination[1] ) & VISITFLAG) == 0) {
            // this cell has not been visited, 
            // therefore, continue the path into it from the origin cell

            // mark the destination cell as visited
            maze.setNumber(NumberFormat.Int8LE,
                index(destination[0], destination[1]),
                cellValue( destination[0], destination[1] ) ^ VISITFLAG);

            // decrement unVisited counter
            unVisited--;
/******************************** */

/****************************************************************** 
 * Modify the values of cells in the buffer to clear cell boundary 
 * between the origin and the destination cells  
 ******************************************************************/

  			if (motion[0] < 0) {
                // moving up one row, clear top line of origin cell   
  				maze.setNumber(NumberFormat.Int8LE, 
                  index(origin[0], origin[1]),
                    cellValue( origin[0], origin[1] ) ^ TOPLINE);
  			}
  			if (motion[0] > 0) {
                // moving down one row, clear top line of destination cell 
                maze.setNumber(NumberFormat.Int8LE, 
                    index(destination[0], destination[1]),
                    cellValue( destination[0], destination[1] ) ^ TOPLINE);
//                    maze.getNumber(NumberFormat.Int8LE, 
//                        index(destination[0], destination[1])) ^ TOPLINE);
  			}
  			if (motion[1] < 0) {
                // moving left one column, clear left line of origin cell 
                maze.setNumber(NumberFormat.Int8LE, 
                    index(origin[0], origin[1]), 
                    cellValue( origin[0], origin[1] ) ^ LEFTLINE);
  			}
  			if (motion[1] > 0) {
                // moving right one column, clear left line of destination cell 
                maze.setNumber(NumberFormat.Int8LE, 
                    index(destination[0], destination[1]), 
                    cellValue( destination[0], destination[1] ) ^ LEFTLINE);
  			}
        } // End of if cell not visited 
  		// Destination becomes the new origin
  		origin[0] = destination[0];
  		origin[1] = destination[1];
    } // End of while (unVisited) loop
    // All cells have been visited. Maze is completely defined.
}
