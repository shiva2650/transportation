#include "heap.h"

/* ============================================================================
 * BINARY MIN-HEAP / PRIORITY QUEUE IMPLEMENTATION
 * ============================================================================ */

/**
 * @brief Allocates and initializes a new MinHeapNode.
 */
MinHeapNode* createMinHeapNode(int vertexIndex, float distance) {
    MinHeapNode* node = (MinHeapNode*)malloc(sizeof(MinHeapNode));
    if (!node) {
        fprintf(stderr, "Memory Error: Failed to allocate MinHeapNode.\n");
        return NULL;
    }
    node->vertexIndex = vertexIndex;
    node->distance = distance;
    return node;
}

/**
 * @brief Creates a Binary Min-Heap with a given capacity and initializes
 *        the position lookup array pos[] to -1.
 */
MinHeap* createMinHeap(int capacity) {
    if (capacity <= 0) return NULL;

    MinHeap* minHeap = (MinHeap*)malloc(sizeof(MinHeap));
    if (!minHeap) {
        fprintf(stderr, "Memory Error: Failed to allocate MinHeap.\n");
        return NULL;
    }

    minHeap->size = 0;
    minHeap->capacity = capacity;

    minHeap->pos = (int*)malloc((size_t)capacity * sizeof(int));
    minHeap->array = (MinHeapNode**)calloc((size_t)capacity, sizeof(MinHeapNode*));

    if (!minHeap->pos || !minHeap->array) {
        fprintf(stderr, "Memory Error: Failed to allocate MinHeap arrays.\n");
        free(minHeap->pos);
        free(minHeap->array);
        free(minHeap);
        return NULL;
    }

    for (int i = 0; i < capacity; i++) {
        minHeap->pos[i] = -1;
        minHeap->array[i] = NULL;
    }

    return minHeap;
}

/**
 * @brief Frees all remaining heap nodes, internal arrays, and the MinHeap struct.
 */
void freeMinHeap(MinHeap* minHeap) {
    if (!minHeap) return;

    if (minHeap->array) {
        for (int i = 0; i < minHeap->size; i++) {
            free(minHeap->array[i]);
        }
        free(minHeap->array);
    }

    free(minHeap->pos);
    free(minHeap);
}

/**
 * @brief Swaps two MinHeapNode pointers in the heap array.
 */
void swapMinHeapNodes(MinHeapNode** a, MinHeapNode** b) {
    MinHeapNode* temp = *a;
    *a = *b;
    *b = temp;
}

/**
 * @brief Restores the min-heap property downward from index `idx` in O(log V) time.
 *        Also keeps `minHeap->pos[]` synchronized whenever two nodes swap positions.
 */
void heapifyDown(MinHeap* minHeap, int idx) {
    if (!minHeap) return;

    int smallest = idx;
    int left = 2 * idx + 1;
    int right = 2 * idx + 2;

    if (left < minHeap->size &&
        minHeap->array[left]->distance < minHeap->array[smallest]->distance) {
        smallest = left;
    }

    if (right < minHeap->size &&
        minHeap->array[right]->distance < minHeap->array[smallest]->distance) {
        smallest = right;
    }

    if (smallest != idx) {
        MinHeapNode* smallestNode = minHeap->array[smallest];
        MinHeapNode* idxNode = minHeap->array[idx];

        /* Update position mapping before swapping */
        minHeap->pos[smallestNode->vertexIndex] = idx;
        minHeap->pos[idxNode->vertexIndex] = smallest;

        /* Swap node pointers */
        swapMinHeapNodes(&minHeap->array[smallest], &minHeap->array[idx]);

        /* Recursively heapify affected subtree */
        heapifyDown(minHeap, smallest);
    }
}

/**
 * @brief Restores the min-heap property upward from index `idx` in O(log V) time.
 *        Synchronizes `minHeap->pos[]` at every parent-child swap.
 */
void heapifyUp(MinHeap* minHeap, int idx) {
    if (!minHeap) return;

    while (idx > 0) {
        int parentIdx = (idx - 1) / 2;
        if (minHeap->array[idx]->distance < minHeap->array[parentIdx]->distance) {
            /* Update positions in pos[] */
            minHeap->pos[minHeap->array[idx]->vertexIndex] = parentIdx;
            minHeap->pos[minHeap->array[parentIdx]->vertexIndex] = idx;

            /* Swap child and parent pointers */
            swapMinHeapNodes(&minHeap->array[idx], &minHeap->array[parentIdx]);

            idx = parentIdx;
        } else {
            break;
        }
    }
}

/**
 * @brief Returns 1 if the min-heap is empty, 0 otherwise.
 */
int isHeapEmpty(const MinHeap* minHeap) {
    return (!minHeap || minHeap->size == 0) ? 1 : 0;
}

/**
 * @brief Checks in O(1) time whether `vertexIndex` is currently inside the heap.
 */
int isInMinHeap(const MinHeap* minHeap, int vertexIndex) {
    if (!minHeap || vertexIndex < 0 || vertexIndex >= minHeap->capacity) {
        return 0;
    }
    int heapIdx = minHeap->pos[vertexIndex];
    return (heapIdx >= 0 && heapIdx < minHeap->size) ? 1 : 0;
}

/**
 * @brief Inserts a new vertex with tentative distance into the Binary Min-Heap.
 * @return 1 on success, 0 on failure.
 */
int insertMinHeap(MinHeap* minHeap, int vertexIndex, float distance) {
    if (!minHeap || minHeap->size >= minHeap->capacity ||
        vertexIndex < 0 || vertexIndex >= minHeap->capacity) {
        return 0;
    }

    MinHeapNode* newNode = createMinHeapNode(vertexIndex, distance);
    if (!newNode) return 0;

    int idx = minHeap->size;
    minHeap->array[idx] = newNode;
    minHeap->pos[vertexIndex] = idx;
    minHeap->size++;

    heapifyUp(minHeap, idx);
    return 1;
}

/**
 * @brief Extracts and returns the node with the minimum tentative distance (root)
 *        in O(log V) time. Caller is responsible for freeing the returned node.
 */
MinHeapNode* extractMin(MinHeap* minHeap) {
    if (isHeapEmpty(minHeap)) {
        return NULL;
    }

    /* Store the root node to return */
    MinHeapNode* root = minHeap->array[0];

    /* Replace root with the last node in the heap */
    MinHeapNode* lastNode = minHeap->array[minHeap->size - 1];
    minHeap->array[0] = lastNode;
    minHeap->array[minHeap->size - 1] = NULL;

    /* Update position map: root is removed (-1), lastNode moves to index 0 */
    minHeap->pos[root->vertexIndex] = -1;
    if (minHeap->size > 1) {
        minHeap->pos[lastNode->vertexIndex] = 0;
    }

    minHeap->size--;

    /* Restore min-heap ordering from the root */
    if (minHeap->size > 0) {
        heapifyDown(minHeap, 0);
    }

    return root;
}

/**
 * @brief Updates (decreases) the tentative distance of `vertexIndex` in O(log V) time
 *        using the direct O(1) index lookup array `minHeap->pos[vertexIndex]`.
 */
void decreaseKey(MinHeap* minHeap, int vertexIndex, float newDistance) {
    if (!isInMinHeap(minHeap, vertexIndex)) {
        return;
    }

    /* O(1) lookup of current heap index for vertexIndex */
    int idx = minHeap->pos[vertexIndex];
    minHeap->array[idx]->distance = newDistance;

    /* Bubble up in O(log V) time to restore heap invariant */
    heapifyUp(minHeap, idx);
}
