/****************************************************************
 * mazeMaker.c													*
 * Applies the Aldus-Broder algorithm for discovering			*
 * uniform spanning trees within a rectangular matrix.  		*
 * See discussion in the following web pages:					*
 * http://weblog.jamisbuck.org/2011/1/17/...					*
 *      ...maze-generation-aldous-broder-algorithm				*
 * http://people.cs.ksu.edu/~ashley78/wiki.ashleycoleman.me/... *
 *      ...index.php/Aldous-Broder_Algorithm.html				*
 *																*
 * David Sparks October 2019									*
 * GCC: compile with the -lm flag								*
 ****************************************************************/

#include <stdio.h>
#include <math.h>

// matrix dimensions
#define ROWS 79
#define COLS 60

// SVG dimensions
// width in inches
#define MAZEWIDTH 7.5
// line thickness in pixels
#define LINEWIDTH 1
// line color in hex
#define LINECOLOR #000000

// cell properties xor'd into to cell value as appropriate
#define LEFTLINE 1 // print left vertical line
#define TOPLINE 2 // print top horizontal line
#define RIGHTLINE 4 // print right vertical line
#define BOTTOMLINE 8 // print bottom horizontal line
#define VISITED 16 // indicates cell has been visited

// variables and data structures
FILE * randSource; // program uses /dev/urandom
// maze-related variables
unsigned int mazeCell[COLS][ROWS];
unsigned int origin[] = {0, 0};
unsigned int destination[] = {0, 0};
int motion[] = {0, 0};
unsigned int unVisited = ROWS * COLS;
int row;
int col;
// SVG-related variables
double cornerLeft;
double cornerTop;
double cornerRight;
double cornerBottom;
// random-number generator (obtain bits from system)
unsigned int rand01() {
// for this to work, the randSource
// file pointer must be initialized already,
// that is, the file must be opened in main()
	unsigned int randByte = 0x80;
	while (randByte == 0x80) {randByte = fgetc(randSource);}
	if (randByte > 0x80) {
		randByte = 1;
	} else {
		randByte = 0;
	}
	return randByte;
}

int main() {
	// initialize variables
	double lineLength;
	double mazeHeight;
	// computed SVG dimensions
	lineLength = (double) MAZEWIDTH / (double) COLS; 
	mazeHeight = lineLength * (double) ROWS;
	// open random bytes file as binary read-only
	randSource = fopen("/dev/urandom", "rb");
		
	// initialize mazeCell array
	// first give all cells a 
	// left line and an upper line
	for (col = 0; col < COLS; col++) {
		for (row = 0; row < ROWS; row++) {
			mazeCell[col][row] = LEFTLINE + TOPLINE;
		}
	}
	// turn off the left line on the upper-left cell
	mazeCell[0][0] ^= LEFTLINE;
	// give bottom row of cells a bottom line
	for (col = 0; col < COLS; col++) {
		mazeCell[col][ROWS-1] += BOTTOMLINE;
	}
	// give right-most column of cells a right side line
	// except for the cell on the bottom row
	for (row = 0; row < (ROWS - 1); row++) {
		mazeCell[COLS-1][row] += RIGHTLINE;
	}
	// select random starting cell
	origin[0] = trunc(((double) fgetc(randSource)) / 256 * COLS);
	origin[1] = trunc(((double) fgetc(randSource)) / 256 * ROWS);
	// mark it as visited
	mazeCell[origin[0]][origin[1]] ^= VISITED;
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
			|| destination[0] >= COLS
			|| destination[1] < 0
			|| destination[1] >= ROWS
		);
		// test destination for visited
		if ((mazeCell[destination[0]][destination[1]] & VISITED) == 0) {
			// it has not been visited
			// so mark it as visited 
			mazeCell[destination[0]][destination[1]] ^= VISITED;
			// decrement unVisited counter
			unVisited -= 1;
			// clear appropriate boundary
			if (motion[0] == -1) {
				mazeCell[origin[0]][origin[1]] ^= LEFTLINE;
			}
			if (motion[0] == 1) {
				mazeCell[destination[0]][destination[1]] ^= LEFTLINE;
			}
			if (motion[1] == -1) {
				mazeCell[origin[0]][origin[1]] ^= TOPLINE;
			}
			if (motion[1] == 1) {
				mazeCell[destination[0]][destination[1]] ^= TOPLINE;
			}
		}
		// let destination be the new origin
		origin[0] = destination[0];
		origin[1] = destination[1];
	}
	// all cells visited, no more random numbers needed
	fclose(randSource);
	// print the SVG file for the maze
	// first, the html headers
	printf("<!DOCTYPE html>\n");
	printf("<html>\n<head>\n");
	printf("<style>\n");
		printf("\t.mLine {\n");
			printf("\t\tstroke: #000000;\n");
			printf("\t\tstroke-width: %dpx;\n", LINEWIDTH);
			printf("\t\tstroke-linecap: round;\n");
		printf("\t}\n");
	printf("</style>\n");
	printf("</head>\n");
	printf("<body>\n");
		printf("\t<svg width=\"%fin\" height=\"%fin\">\n", MAZEWIDTH, mazeHeight);
		// go col by col
		for (col = 0; col < COLS; col++) {
			for (row = 0; row < ROWS; row++){
			// locate the corners of the cell
				cornerLeft = lineLength * col;
				cornerTop = lineLength * row;
				cornerRight = cornerLeft + lineLength;
				cornerBottom = cornerTop + lineLength;
				// print the SVG group tag for the cell
				printf("\t\t<g id=\"row%dcol%d\">\n",row,col);
				// top line
				if (mazeCell[col][row] & TOPLINE) {
					printf("\t\t\t<!-- Top Line -->\n");
					printf("\t\t\t<line class=\"mLine\" ");
					printf("x1=\"%fin\" y1=\"%fin\" ", cornerLeft, cornerTop);
					printf("x2=\"%fin\" y2=\"%fin\" />\n", cornerRight, cornerTop);
				}
				// left side line
				if (mazeCell[col][row] & LEFTLINE) {
					printf("\t\t\t<!-- Left Line -->\n");
					printf("\t\t\t<line class=\"mLine\" ");
					printf("x1=\"%fin\" y1=\"%fin\" ", cornerLeft, cornerTop);
					printf("x2=\"%fin\" y2=\"%fin\" />\n", cornerLeft, cornerBottom);
				}
				// right side line
				if (mazeCell[col][row] & RIGHTLINE) {
					printf("\t\t\t<!-- Right Line -->\n");
					printf("\t\t\t<line class=\"mLine\" ");
					printf("x1=\"%fin\" y1=\"%fin\" ", cornerRight, cornerTop);
					printf("x2=\"%fin\" y2=\"%fin\" />\n", cornerRight, cornerBottom);
				}
				// bottom line
				if (mazeCell[col][row] & BOTTOMLINE) {
					printf("\t\t\t<!-- Bottom LIne -->\n");
					printf("\t\t\t<line class=\"mLine\" ");
					printf("x1=\"%fin\" y1=\"%fin\" ", cornerLeft, cornerBottom);
					printf("x2=\"%fin\" y2=\"%fin\" />\n", cornerRight, cornerBottom);
				}
				// close the SVG group tag for the cell
				printf("\t\t</g>\n");
			} // end for row
		} // end for col
		// print the closing SVG tag
		printf("\t</svg>\n");
	// close the body and html tags
	printf("</body>\n</html>\n");

	return 0;
}
