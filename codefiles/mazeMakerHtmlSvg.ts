let x = 0;
serial.redirectToUSB();
/******************************************************/
    // random-number generator returns 0 or 1
    // used below in makeMaze() function
    function rand01() {
      let randByte = 0;
    	if (Math.random() >= 0.5) {
    		randByte = 1;
	    }
      return randByte;
    }
    
    // returns an index number calculated
    // from a pair of row and column numbers
    function index (row: number, col: number, COLS: number) {
      return (row * COLS) + col;
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

    // maze creation routine
    function makeMaze() {
    // matrix dimensions
    const ROWS = 10;
    const COLS = 10;
    
    // SVG dimensions
    // width in inches
    const MAZEWIDTH = 7.5;
    // line thickness in pixels
    const LINEWIDTH =0.2
    // line color in hex
    const LINECOLOR = 0x000000;

    // cell properties xor'd into to cell value as appropriate
    const LEFTLINE = 1 // print left vertical line
    const TOPLINE = 2 // print top horizontal line
    const RIGHTLINE = 4 // print right vertical line
    const BOTTOMLINE = 8 // print bottom horizontal line
    const VISITED = 16 // indicates cell has been visited
    
    // maze-related variables
    let cellCount = ROWS * COLS;
      
    /********************************************************************************* 
     * The maze array is stored in a buffer of raw bytes, 
     * one byte per maze cell, in an effort to conserve RAM.
     * The buffer object is defined below with the name, mazeBuffer.
     * The buffer's values are exposed by getter and setter methods,
     * getNumber() and setNumber().
     * The methods take a NumberFormat object as an argument.
     * We use the NumberFormat.Int8LE, representing 8-bit signed integers.
     * The methods also take an offset into the buffer.
     * Example, 10 rows of 5 cols gives a 50-byte buffer.
     * Its values may be accessed with an offset value of 0 through 49.
     * Translating offset from a row, column context requires calcuation.
     * offset = (<row number> * <number of columns>) + <column number>.
     * This is handled by the index(row,col, COLS) function defined above.
     * Example of getting a value at row, col:
     * value = mazeBuffer.getNumber(NumberFormat.Int8LE, index(row, col, COLS))
     *********************************************************************************/
    let mazeBuffer = pins.createBuffer(cellCount); // initializes bytes to 0
      
    /*********************************************************************************
     * I want to keep the program in row,col context as much as possible.
     * Because it is easier for me, a human, 
     * to read and understand the code that way.
     * The arrays for origin, destination, and motion
     * are regular Typescript numbers because it's easiest that way.
     *********************************************************************************/
    let origin = [0,0];  
    let destination = [0,0];
    let motion = [0,0];
      
    let unVisited = cellCount;
    let row = 0;
    let col = 0;
    // SVG-related variables
    let cornerLeft = 0;
    let cornerTop = 0;
    let cornerRight = 0;
    let cornerBottom = 0;
  	// computed SVG dimensions
	  let lineLength = 1.0 * MAZEWIDTH / COLS; 
	  let mazeHeight = lineLength * ROWS;
      
  	// initialize mazeCell array
    // so easy to do in TypeScript!
    // All cells begin with a top line and a left line
    mazeBuffer.fill(TOPLINE + LEFTLINE);

/****************************************************
 * The following section modifies the initial values
 * of certain cells in the buffer
 ****************************************************/

  	// turn off the left line on the upper-left cell
  	mazeBuffer.setNumber(NumberFormat.Int8LE, 0, 
      mazeBuffer.getNumber(NumberFormat.Int8LE, 0) ^ LEFTLINE);
  
  	// give bottom row of cells a bottom line
  	for (col = 0; col < COLS; col++) {
      /*********************************************************
       * (ROWS - 1) gives the row number of the bottom row
       * when counting from zero, as Javascript does for arrays.
       *********************************************************/
  		mazeBuffer.setNumber(NumberFormat.Int8LE, index((ROWS - 1), col, COLS),
          mazeBuffer.getNumber(NumberFormat.Int8LE, index((ROWS - 1), col, COLS)) + BOTTOMLINE);
  	}
      
  	// Give the right-most column of cells a right side line
  	// except for the cell on the bottom row.
  	for (row = 0; row < ROWS - 1; row++) {
      /**********************************************************
       * COLS - 1 is the offset for the right-most cell of a row
       **********************************************************/
        mazeBuffer.setNumber(NumberFormat.Int8LE, index(row, (COLS - 1), COLS),
          mazeBuffer.getNumber(NumberFormat.Int8LE, index(row, (COLS - 1), COLS)) + RIGHTLINE);
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
  	origin[0] = Math.trunc(Math.random() * ROWS);
  	origin[1] = Math.trunc(Math.random() * COLS);
  	// mark it as visited
    // origin[0] is a row number, and origin[1] is a col number
    mazeBuffer.setNumber(NumberFormat.Int8LE, index(origin[0], origin[1], COLS),
       mazeBuffer.getNumber(NumberFormat.Int8LE, index(origin[0], origin[1], COLS)) ^ VISITED);
  	// decrement count of unvisited cells
  	unVisited -= 1;
      
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
  			|| destination[0] >= ROWS
  			|| destination[1] < 0
  			|| destination[1] >= COLS
  		);      

  		// test destination for visited
        if ((mazeBuffer.getNumber(NumberFormat.Int8LE, 
            index(destination[0], destination[1], COLS)) & VISITED) == 0) {
            // this cell has not been visited, 
            // therefore, continue the path into it from the origin cell

            // mark the destination cell as visited
            mazeBuffer.setNumber(NumberFormat.Int8LE,
                index(destination[0], destination[1], COLS),
                mazeBuffer.getNumber(NumberFormat.Int8LE,
                    index(destination[0], destination[1], COLS)) ^ VISITED);

            // decrement unVisited counter
            unVisited--;

/****************************************************************** 
 * Modify the values of cells in the buffer to clear cell boundary 
 * between the origin and the destination cells  
 ******************************************************************/

  			if (motion[0] < 0) {
                // moving up one row, clear top line of origin cell   
  				mazeBuffer.setNumber(NumberFormat.Int8LE, 
                  index(origin[0], origin[1], COLS),
                  mazeBuffer.getNumber(NumberFormat.Int8LE, 
                  index(origin[0], origin[1], COLS)) ^ TOPLINE);        
  			}
  			if (motion[0] > 0) {
                // moving down one row, clear top line of destination cell 
                mazeBuffer.setNumber(NumberFormat.Int8LE, 
                    index(destination[0], destination[1], COLS),
                    mazeBuffer.getNumber(NumberFormat.Int8LE, 
                        index(destination[0], destination[1], COLS)) ^ TOPLINE);
  			}
  			if (motion[1] < 0) {
                // moving left one column, clear left line of origin cell 
                mazeBuffer.setNumber(NumberFormat.Int8LE, 
                    index(origin[0], origin[1], COLS), 
                    mazeBuffer.getNumber(NumberFormat.Int8LE, 
                        index(origin[0], origin[1], COLS)) ^ LEFTLINE);
  			}
  			if (motion[1] > 0) {
                // moving right one column, clear left line of destination cell 
                mazeBuffer.setNumber(NumberFormat.Int8LE, 
                    index(destination[0], destination[1], COLS), 
                    mazeBuffer.getNumber(NumberFormat.Int8LE, 
                        index(destination[0], destination[1], COLS)) ^ LEFTLINE);
  			}
        } // End of if cell not visited 
  		// Destination becomes the new origin
  		origin[0] = destination[0];
  		origin[1] = destination[1];
    } // End of while (unVisited) loop
    // All cells have been visited. Maze is completely defined.

/***************************************************************
 * The next section writes out an html page to display the maze 
 ***************************************************************/
	// print the SVG file for the maze
	// first, the html headers

	serial.writeLine("<!DOCTYPE html>");
	serial.writeLine("<html>\n<head>");
	serial.writeLine("<style>");
		serial.writeLine("\t.mLine {");
			serial.writeLine("\t\tstroke: #000000;");
			serial.writeLine("\t\tstroke-width: " + LINEWIDTH + "px;");
			serial.writeLine("\t\tstroke-linecap: round;");
		serial.writeLine("\t}");
	serial.writeLine("</style>");
	serial.writeLine("</head>");
	serial.writeLine("<body>");
// SVG code goes here 
	serial.writeLine("</body>\n</html>");
} // End of makeMaze function 

makeMaze();
