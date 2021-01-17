/****************************************************************
 * mazeMakerSVG_v3.c											*
 * Applies the Aldus-Broder algorithm for discovering			*
 * uniform spanning trees within a rectangular matrix.  		*
 * See discussion in the following web pages:					*
 * http://weblog.jamisbuck.org/2011/1/17/...					*
 *      ...maze-generation-aldous-broder-algorithm				*
 * http://people.cs.ksu.edu/~ashley78/wiki.ashleycoleman.me/... *
 *      ...index.php/Aldous-Broder_Algorithm.html				*
 *																*
 * ADDS: viewbox, g tag wrapper for positioning content			*
 *																*
 * David Sparks October 2019									*
 * GCC: compile with the -lm flag								*
 ****************************************************************/

#include <stdio.h>
#include <math.h>

// matrix dimensions
#define ROWS 24
#define COLS 20

// SVG dimensions
// width in inches
#define MAZEWIDTH 7.5
// line thickness in inches
#define LINEWIDTH 0.02
// line color in hex
#define LINECOLOR #000000

// cell properties xor'd into to cell value as appropriate
#define LEFTLINE 1 // print left vertical line
#define TOPLINE 2 // print top horizontal line
#define RIGHTLINE 4 // print right vertical line
#define BOTTOMLINE 8 // print bottom horizontal line
#define VISITED 16 // indicates cell has been visited
#define PORTAL_LEFT 32
#define PORTAL_RIGHT 64
#define PORTAL_TOP 128
#define PORTAL_BOTTOM 256

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
unsigned int randRow;
unsigned int randCol;
// SVG-related variables
double innerWidth;
double innerHeight;
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
	double portalTag;
	double mazeHeight;
	// computed SVG dimensions
	// inner SVG width
	innerWidth = (double) MAZEWIDTH - LINEWIDTH;
	lineLength = innerWidth / (double) COLS;
	portalTag = lineLength / 5;
	innerHeight = lineLength * (double) ROWS;
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
	// give bottom row of cells a bottom line
	for (col = 0; col < COLS; col++) {
		mazeCell[col][ROWS-1] += BOTTOMLINE;
	}

	// give right-most column of cells a right side line
	for (row = 0; row < ROWS; row++) {
		mazeCell[COLS-1][row] += RIGHTLINE;
	}
	// establish top portal on a random column
	randCol = fgetc(randSource) % COLS;
	mazeCell[randCol][0] ^= TOPLINE;
	mazeCell[randCol][0] ^= PORTAL_TOP;

	// establish a bottom portal on a random column
	randCol = fgetc(randSource) % COLS;
	mazeCell[randCol][ROWS-1] ^= BOTTOMLINE;
	mazeCell[randCol][ROWS-1] ^= PORTAL_BOTTOM;
/*
	// establish left portal on a random row
	randRow = fgetc(randSource) % ROWS;
	mazeCell[0][randRow] ^= LEFTLINE;
	mazeCell[0][randRow] ^= PORTAL_LEFT;
*/
/*
	// establish right portal on a random row
	randRow = fgetc(randSource) % ROWS;
	mazeCell[COLS-1][randRow] ^= RIGHTLINE;
	mazeCell[COLS-1][randRow] ^= PORTAL_RIGHT;
*/
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
		// maze line style
		printf("\t.mLine {\n");
			printf("\t\tstroke: #000000;\n");
			printf("\t\tstroke-width: %f;\n", LINEWIDTH);
			printf("\t\tstroke-linecap: round;\n");
		printf("\t}\n");
		// portal entry dot style
		printf("\t.eDot {\n");
			printf("\t\tfill: #000000;\n");
		printf("\t}\n");
	printf("</style>\n");
	printf("</head>\n");
	printf("<body>\n");
		// SVG tag 
		printf("\t<svg width=\"%fin\" height=\"%fin\" ", 
				MAZEWIDTH, innerHeight + LINEWIDTH);
		printf("viewbox=\"0 0 %f %f\">\n",
				MAZEWIDTH, innerHeight + LINEWIDTH);

		// g tag to translate the maze
		printf("\t<g transform=\"translate(%f %f)\">\n",
				 (double) LINEWIDTH/2.0 + 7.5 - MAZEWIDTH,
		 		(double) LINEWIDTH/2.0);
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
					printf("x1=\"%f\" y1=\"%f\" ", cornerLeft, cornerTop);
					printf("x2=\"%f\" y2=\"%f\" />\n", cornerRight, cornerTop);
				}
				// left side line
				if (mazeCell[col][row] & LEFTLINE) {
					printf("\t\t\t<!-- Left Line -->\n");
					printf("\t\t\t<line class=\"mLine\" ");
					printf("x1=\"%f\" y1=\"%f\" ", cornerLeft, cornerTop);
					printf("x2=\"%f\" y2=\"%f\" />\n", cornerLeft, cornerBottom);
				}
				// right side line
				if (mazeCell[col][row] & RIGHTLINE) {
					printf("\t\t\t<!-- Right Line -->\n");
					printf("\t\t\t<line class=\"mLine\" ");
					printf("x1=\"%f\" y1=\"%f\" ", cornerRight, cornerTop);
					printf("x2=\"%f\" y2=\"%f\" />\n", cornerRight, cornerBottom);
				}
				// bottom line
				if (mazeCell[col][row] & BOTTOMLINE) {
					printf("\t\t\t<!-- Bottom LIne -->\n");
					printf("\t\t\t<line class=\"mLine\" ");
					printf("x1=\"%f\" y1=\"%f\" ", cornerLeft, cornerBottom);
					printf("x2=\"%f\" y2=\"%f\" />\n", cornerRight, cornerBottom);
				}
				// top portal
				if (mazeCell[col][row] & PORTAL_TOP) {
					printf("\t\t\t<!-- upper portal left dot -->\n");
					printf("\t\t\t<circle class=\"eDot\" ");
					printf("cx=\"%f\" cy=\"%f\" ", cornerLeft, cornerTop);
					printf("r=\"%f\" />\n", portalTag);
					printf("\t\t\t<!-- upper portal right dot -->\n");
					printf("\t\t\t<circle class=\"eDot\" ");
					printf("cx=\"%f\" cy=\"%f\" ", cornerRight, cornerTop);
					printf("r=\"%f\" />\n", portalTag);
				}
				// bottom portal
				if (mazeCell[col][row] & PORTAL_BOTTOM) {
					printf("\t\t\t<!-- lower portal left dot -->\n");
					printf("\t\t\t<circle class=\"eDot\" ");
					printf("cx=\"%f\" cy=\"%f\" ", cornerLeft, cornerBottom);
					printf("r=\"%f\" />\n", portalTag);
					printf("\t\t\t<!-- upper portal right dot -->\n");
					printf("\t\t\t<circle class=\"eDot\" ");
					printf("cx=\"%f\" cy=\"%f\" ", cornerRight, cornerBottom);
					printf("r=\"%f\" />\n", portalTag);
				}
				// left side portal
				if (mazeCell[col][row] & PORTAL_LEFT) {
					printf("\t\t\t<!-- left portal upper dot -->\n");
					printf("\t\t\t<circle class=\"eDot\" ");
					printf("cx=\"%f\" cy=\"%f\" ", cornerLeft, cornerTop);
					printf("r=\"%f\" />\n", portalTag);
					printf("\t\t\t<!-- left portal lower dot -->\n");
					printf("\t\t\t<circle class=\"eDot\" ");
					printf("cx=\"%f\" cy=\"%f\" ", cornerLeft, cornerBottom);
					printf("r=\"%f\" />\n", portalTag);
				}
				// right side portal
				if (mazeCell[col][row] & PORTAL_RIGHT) {
					printf("\t\t\t<!-- right portal upper dot -->\n");
					printf("\t\t\t<circle class=\"eDot\" ");
					printf("cx=\"%f\" cy=\"%f\" ", cornerRight, cornerTop);
					printf("r=\"%f\" />\n", portalTag);
					printf("\t\t\t<!-- left portal lower dot -->\n");
					printf("\t\t\t<circle class=\"eDot\" ");
					printf("cx=\"%f\" cy=\"%f\" ", cornerRight, cornerBottom);
					printf("r=\"%f\" />\n", portalTag);
				}
				// close the SVG group tag for the cell
				printf("\t\t</g>\n");
			} // end for row
		} // end for col
		// print the closing SVG tags
		printf("\t</g>\n");
		printf("\t</svg>\n");
	// close the body and html tags
	printf("</body>\n</html>\n");

	return 0;
}
