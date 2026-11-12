#ifndef QUEUE_H
#define QUEUE_H

#include <stdio.h>
#include <stdlib.h>

/* ============================================================================
 * FIFO QUEUE DATA STRUCTURES (FOR BREADTH-FIRST SEARCH)
 * ============================================================================ */

/**
 * @brief Singly linked list node for the FIFO Queue.
 */
typedef struct QueueNode {
    int vertexIndex;            /* Graph vertex index queued for BFS exploration */
    struct QueueNode* next;     /* Pointer to next node in queue */
} QueueNode;

/**
 * @brief Linked-list-based FIFO Queue structure.
 */
typedef struct {
    QueueNode* front;           /* Dequeue from front (head) */
    QueueNode* rear;            /* Enqueue at rear (tail) */
    int size;                   /* Current number of elements in the queue */
} Queue;

/* ============================================================================
 * QUEUE FUNCTION PROTOTYPES
 * ============================================================================ */

Queue* createQueue(void);
void freeQueue(Queue* q);

int isQueueEmpty(const Queue* q);
int enqueue(Queue* q, int vertexIndex);
int dequeue(Queue* q);
int peekQueue(const Queue* q);

#endif /* QUEUE_H */
