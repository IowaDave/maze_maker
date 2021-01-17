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
#define ROWS (16)
#define COLS (33)
// cell properties summed into to cell value as appropriate
#define LEFTBLANK (1) // do not print left vertical line
#define TOPBLANK (2) // do not print top horizontal line
#define VISITED (4) // indicates cell has been visited

// variables and data structures
FILE * randSource; // program uses /dev/urandom
unsigned int mazeCell[COLS][ROWS];
unsigned int origin[] = {0, 0};
unsigned int destination[] = {0, 0};
int motion[] = {0, 0};
unsigned int unVisited = ROWS * COLS;
int row;
int col;

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

// not used in the current version
// but left for historical purposes
void printTheArray() {
	for (row = 0; row < ROWS; row++) {
		for (col = 0; col < COLS; col++) {
			printf("%u ", mazeCell[col][row]);
		}
		printf("\n");
	}
	printf("\n");
}

int main() {

	// open random bytes file as binary read-only
	randSource = fopen("/dev/urandom", "rb");
		
	// initialize mazeCell array
	for (col = 0; col < COLS; col++) {
		for (row = 0; row < ROWS; row++) {
			mazeCell[col][row] = 0;
		}
	}
	
	// select random starting point
	origin[0] = trunc(((double) fgetc(randSource)) / 256 * COLS);
	origin[1] = trunc(((double) fgetc(randSource)) / 256 * ROWS);
	// mark it as visited
	mazeCell[origin[0]][origin[1]] += VISITED;
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
		if (mazeCell[destination[0]][destination[1]] == 0) {
			// it has not been visited
			// so mark it as visited 
			mazeCell[destination[0]][destination[1]] += VISITED;
			// decrement unVisited counter
			unVisited -= 1;
			// clear appropriate boundary
			if (motion[0] == -1) {
				mazeCell[origin[0]][origin[1]] += LEFTBLANK;
			}
			if (motion[0] == 1) {
				mazeCell[destination[0]][destination[1]] += LEFTBLANK;
			}
			if (motion[1] == -1) {
				mazeCell[origin[0]][origin[1]] += TOPBLANK;
			}
			if (motion[1] == 1) {
				mazeCell[destination[0]][destination[1]] += TOPBLANK;
			}
		}
		// let destination be the new origin
		origin[0] = destination[0];
		origin[1] = destination[1];
	}
	// all cells visited, no more random numbers needed
	fclose(randSource);
	// print the maze
	// go row by row
	for (row = 0; row < ROWS; row++){
		printf("*"); // maze left-boundary asterisk
		// do the top lines of the cells in the row
		for (col = 0; col < COLS; col++) {
			if ((mazeCell[col][row] & 2) == 0) {
				printf("****");
			} else {
				printf("   *");
			}
		}
		printf("\n");
		// do the left edges of the cells in the row
		for (col = 0; col < COLS; col++) {
			if ((mazeCell[col][row] & 1) == 0) {
				printf("|");
			} else {
				printf(" ");
			}
			printf("   ");
		}
		// add vertical bar on the right edge of the maze
		printf("|\n");
	}
	// after all rows processed, print a row of asterisks
	printf("*");
	for (col = 0; col < COLS; col++) {
		printf("****");
	}
	printf("\n");
}
