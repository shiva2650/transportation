#ifndef HEAP_H
#define HEAP_H

#include <stdio.h>
#include <stdlib.h>

/* ============================================================================
 * BINARY MIN-HEAP / PRIORITY QUEUE DATA STRUCTURES
 * ============================================================================ */

/**
 * @brief Represents a single element inside the Binary Min-Heap.
 */
typedef struct {
    int vertexIndex;            /* Internal graph index of the bus stop */
    float distance;             /* Tentative shortest distance from source */
} MinHeapNode;

/**
 * @brief Custom Binary Min-Heap with an index-position mapping array
 *        to support O(log V) decrease-key operations during Dijkstra's algorithm.
 */
typedef struct {
    int size;                   /* Current number of elements in the heap */
    int capacity;               /* Maximum number of elements heap can hold */
    int* pos;                   /* pos[vertexIndex] stores current heap index */
    MinHeapNode** array;        /* Dynamic array of pointers to MinHeapNode */
} MinHeap;

/* ============================================================================
 * MIN-HEAP FUNCTION PROTOTYPES
 * ============================================================================ */

MinHeapNode* createMinHeapNode(int vertexIndex, float distance);
MinHeap* createMinHeap(int capacity);
void freeMinHeap(MinHeap* minHeap);

void swapMinHeapNodes(MinHeapNode** a, MinHeapNode** b);
void heapifyDown(MinHeap* minHeap, int idx);
void heapifyUp(MinHeap* minHeap, int idx);

int isHeapEmpty(const MinHeap* minHeap);
int isInMinHeap(const MinHeap* minHeap, int vertexIndex);

int insertMinHeap(MinHeap* minHeap, int vertexIndex, float distance);
MinHeapNode* extractMin(MinHeap* minHeap);
void decreaseKey(MinHeap* minHeap, int vertexIndex, float newDistance);

#endif /* HEAP_H */
