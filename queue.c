#include "queue.h"

/* ============================================================================
 * LINKED-LIST FIFO QUEUE IMPLEMENTATION (FOR BFS)
 * ============================================================================ */

/**
 * @brief Allocates and initializes an empty FIFO Queue.
 */
Queue* createQueue(void) {
    Queue* q = (Queue*)malloc(sizeof(Queue));
    if (!q) {
        fprintf(stderr, "Memory Error: Failed to allocate Queue.\n");
        return NULL;
    }
    q->front = NULL;
    q->rear = NULL;
    q->size = 0;
    return q;
}

/**
 * @brief Frees all remaining nodes in the queue and the Queue struct itself.
 */
void freeQueue(Queue* q) {
    if (!q) return;
    QueueNode* curr = q->front;
    while (curr) {
        QueueNode* temp = curr;
        curr = curr->next;
        free(temp);
    }
    free(q);
}

/**
 * @brief Returns 1 if the queue is empty, 0 otherwise.
 */
int isQueueEmpty(const Queue* q) {
    return (!q || q->front == NULL || q->size == 0) ? 1 : 0;
}

/**
 * @brief Enqueues a vertex index at the rear of the queue in O(1) time.
 * @return 1 on success, 0 on allocation failure.
 */
int enqueue(Queue* q, int vertexIndex) {
    if (!q) return 0;

    QueueNode* newNode = (QueueNode*)malloc(sizeof(QueueNode));
    if (!newNode) {
        fprintf(stderr, "Memory Error: Failed to allocate QueueNode.\n");
        return 0;
    }

    newNode->vertexIndex = vertexIndex;
    newNode->next = NULL;

    if (q->rear == NULL) {
        /* Queue was empty: both front and rear point to newNode */
        q->front = newNode;
        q->rear = newNode;
    } else {
        /* Append at tail and advance rear pointer */
        q->rear->next = newNode;
        q->rear = newNode;
    }

    q->size++;
    return 1;
}

/**
 * @brief Dequeues and returns the vertex index at the front of the queue in O(1) time.
 * @return Front vertexIndex, or -1 if the queue is empty.
 */
int dequeue(Queue* q) {
    if (isQueueEmpty(q)) {
        return -1;
    }

    QueueNode* temp = q->front;
    int vertexIndex = temp->vertexIndex;

    q->front = q->front->next;
    if (q->front == NULL) {
        /* Queue became empty: reset rear pointer to NULL */
        q->rear = NULL;
    }

    free(temp);
    q->size--;
    return vertexIndex;
}

/**
 * @brief Returns the vertex index at the front without removing it.
 */
int peekQueue(const Queue* q) {
    if (isQueueEmpty(q)) {
        return -1;
    }
    return q->front->vertexIndex;
}
