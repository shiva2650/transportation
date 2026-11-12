#include "graph.h"
#include "heap.h"
#include "queue.h"

/* ============================================================================
 * INTERNAL HELPER FUNCTIONS
 * ============================================================================ */

/**
 * @brief Case-insensitive string comparison (standard C99 portable).
 */
int strCaseCompare(const char* s1, const char* s2) {
    if (!s1 || !s2) return (s1 == s2) ? 0 : (s1 ? 1 : -1);
    while (*s1 && *s2) {
        int c1 = tolower((unsigned char)*s1);
        int c2 = tolower((unsigned char)*s2);
        if (c1 != c2) return c1 - c2;
        s1++;
        s2++;
    }
    return tolower((unsigned char)*s1) - tolower((unsigned char)*s2);
}

/**
 * @brief Allocates a new adjacency list node representing a directed edge.
 */
static AdjListNode* createAdjListNode(int destIndex, int destStopId, float distance) {
    AdjListNode* newNode = (AdjListNode*)malloc(sizeof(AdjListNode));
    if (!newNode) {
        fprintf(stderr, "Memory Error: Failed to allocate AdjListNode.\n");
        return NULL;
    }
    newNode->destIndex = destIndex;
    newNode->destStopId = destStopId;
    newNode->distance = distance;
    newNode->next = NULL;
    return newNode;
}

/* ============================================================================
 * GRAPH LIFECYCLE & LOOKUP FUNCTIONS
 * ============================================================================ */

/**
 * @brief Creates and initializes an empty Graph with a given maximum capacity.
 */
Graph* createGraph(int capacity) {
    if (capacity <= 0) capacity = MAX_STOPS;

    Graph* graph = (Graph*)malloc(sizeof(Graph));
    if (!graph) {
        fprintf(stderr, "Memory Error: Failed to allocate Graph.\n");
        return NULL;
    }

    graph->numVertices = 0;
    graph->capacity = capacity;
    graph->avgSpeedKmph = DEFAULT_BUS_SPEED;

    graph->vertices = (Vertex*)calloc((size_t)capacity, sizeof(Vertex));
    if (!graph->vertices) {
        fprintf(stderr, "Memory Error: Failed to allocate Vertex array.\n");
        free(graph);
        return NULL;
    }

    for (int i = 0; i < capacity; i++) {
        graph->vertices[i].id = -1;
        graph->vertices[i].name[0] = '\0';
        graph->vertices[i].active = 0;
        graph->vertices[i].head = NULL;
    }

    return graph;
}

/**
 * @brief Removes all stops and edges without freeing the Graph shell itself.
 */
void clearGraph(Graph* graph) {
    if (!graph || !graph->vertices) return;

    for (int i = 0; i < graph->capacity; i++) {
        AdjListNode* curr = graph->vertices[i].head;
        while (curr) {
            AdjListNode* temp = curr;
            curr = curr->next;
            free(temp);
        }
        graph->vertices[i].head = NULL;
        graph->vertices[i].active = 0;
        graph->vertices[i].id = -1;
        graph->vertices[i].name[0] = '\0';
    }
    graph->numVertices = 0;
}

/**
 * @brief Completely frees all dynamic memory associated with the Graph.
 */
void freeGraph(Graph* graph) {
    if (!graph) return;
    clearGraph(graph);
    free(graph->vertices);
    free(graph);
}

/**
 * @brief Finds the internal vertex array index for a given Stop ID.
 * @return Index (0 .. capacity-1) if active, or -1 if not found.
 */
int findVertexIndexById(const Graph* graph, int stopId) {
    if (!graph || stopId <= 0) return -1;
    for (int i = 0; i < graph->capacity; i++) {
        if (graph->vertices[i].active && graph->vertices[i].id == stopId) {
            return i;
        }
    }
    return -1;
}

/**
 * @brief Finds the internal vertex array index for a given Stop Name.
 * @return Index (0 .. capacity-1) if active, or -1 if not found.
 */
int findVertexIndexByName(const Graph* graph, const char* name) {
    if (!graph || !name || name[0] == '\0') return -1;
    for (int i = 0; i < graph->capacity; i++) {
        if (graph->vertices[i].active &&
            strCaseCompare(graph->vertices[i].name, name) == 0) {
            return i;
        }
    }
    return -1;
}

/* ============================================================================
 * BUS STOP & BUS CONNECTION MUTATION FUNCTIONS
 * ============================================================================ */

/**
 * @brief Adds a new bus stop to the graph.
 * @return Assigned internal vertex index (>= 0) on success,
 *         -1 if duplicate ID/Name, -2 if capacity full, -3 on invalid args.
 */
int addBusStop(Graph* graph, int stopId, const char* name) {
    if (!graph || stopId <= 0 || !name || strlen(name) == 0) {
        return -3;
    }

    /* Check for duplicate Stop ID or duplicate Stop Name */
    if (findVertexIndexById(graph, stopId) != -1) {
        return -1;
    }
    if (findVertexIndexByName(graph, name) != -1) {
        return -1;
    }

    /* Locate first available inactive slot */
    int freeSlot = -1;
    for (int i = 0; i < graph->capacity; i++) {
        if (!graph->vertices[i].active) {
            freeSlot = i;
            break;
        }
    }

    if (freeSlot == -1) {
        return -2; /* Graph capacity reached */
    }

    graph->vertices[freeSlot].id = stopId;
    strncpy(graph->vertices[freeSlot].name, name, MAX_STOP_NAME - 1);
    graph->vertices[freeSlot].name[MAX_STOP_NAME - 1] = '\0';
    graph->vertices[freeSlot].active = 1;
    graph->vertices[freeSlot].head = NULL;
    graph->numVertices++;

    return freeSlot;
}

/**
 * @brief Deletes a bus stop and removes all incident bus connections.
 * @return 1 on success, 0 if stop not found.
 */
int deleteBusStop(Graph* graph, int stopId) {
    int targetIdx = findVertexIndexById(graph, stopId);
    if (targetIdx == -1) return 0;

    /* 1. Free all outgoing edges from targetIdx */
    AdjListNode* curr = graph->vertices[targetIdx].head;
    while (curr) {
        AdjListNode* temp = curr;
        curr = curr->next;
        free(temp);
    }
    graph->vertices[targetIdx].head = NULL;

    /* 2. Remove all incoming edges to targetIdx from every other vertex */
    for (int i = 0; i < graph->capacity; i++) {
        if (i == targetIdx || !graph->vertices[i].active) continue;

        AdjListNode* prev = NULL;
        AdjListNode* node = graph->vertices[i].head;
        while (node) {
            if (node->destIndex == targetIdx) {
                AdjListNode* toDelete = node;
                if (!prev) {
                    graph->vertices[i].head = node->next;
                } else {
                    prev->next = node->next;
                }
                node = node->next;
                free(toDelete);
            } else {
                prev = node;
                node = node->next;
            }
        }
    }

    /* 3. Mark vertex slot inactive */
    graph->vertices[targetIdx].active = 0;
    graph->vertices[targetIdx].id = -1;
    graph->vertices[targetIdx].name[0] = '\0';
    graph->numVertices--;

    return 1;
}

/**
 * @brief Helper to insert or update a single directed edge (u -> v).
 */
static int upsertDirectedEdge(Graph* graph, int uIdx, int vIdx, float distance) {
    AdjListNode* curr = graph->vertices[uIdx].head;
    AdjListNode* prev = NULL;

    /* If edge already exists, update its distance weight */
    while (curr) {
        if (curr->destIndex == vIdx) {
            curr->distance = distance;
            return 2; /* Updated existing connection */
        }
        prev = curr;
        curr = curr->next;
    }

    /* Otherwise append at end of adjacency list to preserve insertion order */
    AdjListNode* newNode = createAdjListNode(vIdx, graph->vertices[vIdx].id, distance);
    if (!newNode) return 0;

    if (!prev) {
        graph->vertices[uIdx].head = newNode;
    } else {
        prev->next = newNode;
    }
    return 1; /* Newly added connection */
}

/**
 * @brief Adds an undirected (two-way) bus route between srcId and destId.
 * @return 1 if added, 2 if updated, -1 if stops missing, -2 if self-loop, -3 if invalid distance.
 */
int addBusConnection(Graph* graph, int srcId, int destId, float distance) {
    if (!graph) return -1;
    if (srcId == destId) return -2;         /* Prevent self-loops */
    if (distance <= 0.0f) return -3;        /* Distance must be strictly positive */

    int uIdx = findVertexIndexById(graph, srcId);
    int vIdx = findVertexIndexById(graph, destId);
    if (uIdx == -1 || vIdx == -1) return -1;

    int status1 = upsertDirectedEdge(graph, uIdx, vIdx, distance);
    int status2 = upsertDirectedEdge(graph, vIdx, uIdx, distance);

    if (status1 == 0 || status2 == 0) return 0;
    return status1;
}

/**
 * @brief Helper to remove a single directed edge (u -> v).
 */
static int removeDirectedEdge(Graph* graph, int uIdx, int vIdx) {
    AdjListNode* curr = graph->vertices[uIdx].head;
    AdjListNode* prev = NULL;

    while (curr) {
        if (curr->destIndex == vIdx) {
            if (!prev) {
                graph->vertices[uIdx].head = curr->next;
            } else {
                prev->next = curr->next;
            }
            free(curr);
            return 1;
        }
        prev = curr;
        curr = curr->next;
    }
    return 0;
}

/**
 * @brief Removes an undirected connection between two bus stops.
 * @return 1 on success, 0 if edge did not exist.
 */
int removeBusConnection(Graph* graph, int srcId, int destId) {
    if (!graph) return 0;
    int uIdx = findVertexIndexById(graph, srcId);
    int vIdx = findVertexIndexById(graph, destId);
    if (uIdx == -1 || vIdx == -1) return 0;

    int r1 = removeDirectedEdge(graph, uIdx, vIdx);
    int r2 = removeDirectedEdge(graph, vIdx, uIdx);
    return (r1 && r2) ? 1 : 0;
}

/**
 * @brief Returns the distance weight of edge (srcIndex -> destIndex), or -1.0f if absent.
 */
float getEdgeWeight(const Graph* graph, int srcIndex, int destIndex) {
    if (!graph || srcIndex < 0 || destIndex < 0 ||
        srcIndex >= graph->capacity || destIndex >= graph->capacity) {
        return -1.0f;
    }
    AdjListNode* curr = graph->vertices[srcIndex].head;
    while (curr) {
        if (curr->destIndex == destIndex) {
            return curr->distance;
        }
        curr = curr->next;
    }
    return -1.0f;
}

/* ============================================================================
 * DISPLAY FUNCTIONS
 * ============================================================================ */

/**
 * @brief Displays all active bus stops in a clean tabular format.
 */
void displayAllBusStops(const Graph* graph) {
    if (!graph || graph->numVertices == 0) {
        printf("\n[Info] The transport network currently has no bus stops.\n");
        return;
    }

    printf("\n--------------------------------------------\n");
    printf(" %-10s | %-28s\n", "Stop ID", "Stop Name");
    printf("--------------------------------------------\n");
    for (int i = 0; i < graph->capacity; i++) {
        if (graph->vertices[i].active) {
            printf(" %-10d | %-28s\n",
                   graph->vertices[i].id,
                   graph->vertices[i].name);
        }
    }
    printf("--------------------------------------------\n");
    printf("Total Active Bus Stops: %d\n", graph->numVertices);
}

/**
 * @brief Displays all bus stops along with their adjacency list connections.
 */
void displayTransportNetwork(const Graph* graph) {
    if (!graph || graph->numVertices == 0) {
        printf("\n[Info] The transport network is empty.\n");
        return;
    }

    printf("\n============================================================\n");
    printf("               PUBLIC TRANSPORT NETWORK MAP                 \n");
    printf("============================================================\n");

    int totalEdges = 0;
    for (int i = 0; i < graph->capacity; i++) {
        if (!graph->vertices[i].active) continue;

        printf("[%d] %-18s --> ", graph->vertices[i].id, graph->vertices[i].name);
        AdjListNode* curr = graph->vertices[i].head;
        if (!curr) {
            printf("(No direct connections)");
        }
        while (curr) {
            int destIdx = curr->destIndex;
            printf("%s (%g km)", graph->vertices[destIdx].name, curr->distance);
            totalEdges++;
            if (curr->next) {
                printf(" -> ");
            }
            curr = curr->next;
        }
        printf("\n");
    }

    printf("============================================================\n");
    printf("Summary: %d Bus Stops | %d Undirected Bus Connections\n",
           graph->numVertices, totalEdges / 2);
}

/* ============================================================================
 * SINGLY LINKED LIST ROUTE RECONSTRUCTION & FORMATTED OUTPUT
 * ============================================================================ */

/**
 * @brief Frees the singly linked list stored inside a RouteResult.
 */
void freeRouteLinkedList(RouteResult* result) {
    if (!result) return;
    PathNode* curr = result->pathListHead;
    while (curr) {
        PathNode* temp = curr;
        curr = curr->next;
        free(temp);
    }
    result->pathListHead = NULL;
}

/**
 * @brief Builds a singly linked list of PathNodes from the ordered stopIndices[]
 *        array and computes totalStops, transfers, and estimatedTimeMinutes.
 */
void buildRouteLinkedList(const Graph* graph, RouteResult* result) {
    if (!graph || !result || !result->found || result->totalStops <= 0) return;

    freeRouteLinkedList(result);

    PathNode* head = NULL;
    PathNode* tail = NULL;

    for (int i = 0; i < result->totalStops; i++) {
        int vIdx = result->stopIndices[i];
        PathNode* newNode = (PathNode*)malloc(sizeof(PathNode));
        if (!newNode) break;

        newNode->stopId = graph->vertices[vIdx].id;
        strncpy(newNode->stopName, graph->vertices[vIdx].name, MAX_STOP_NAME - 1);
        newNode->stopName[MAX_STOP_NAME - 1] = '\0';
        newNode->next = NULL;

        if (!head) {
            head = newNode;
            tail = newNode;
        } else {
            tail->next = newNode;
            tail = newNode;
        }
    }

    result->pathListHead = head;
    result->transfers = (result->totalStops > 2) ? (result->totalStops - 2) : 0;

    float speed = (graph->avgSpeedKmph > 0.0f) ? graph->avgSpeedKmph : DEFAULT_BUS_SPEED;
    float exactMinutes = (result->totalDistance / speed) * 60.0f;
    result->estimatedTimeMinutes = (int)(exactMinutes + 0.5f); /* Round to nearest minute */
}

/**
 * @brief Prints a RouteResult in the exact required academic format,
 *        traversing the singly linked list of PathNodes.
 */
void printRouteResult(const Graph* graph, const RouteResult* result, const char* title) {
    if (!graph || !result || !result->found) {
        printf("\nNo route exists between the selected bus stops.\n");
        return;
    }

    if (title && strlen(title) > 0) {
        printf("\n%s\n", title);
    } else {
        printf("\nAvailable Route:\n");
    }

    /* Traverse the Singly Linked List of PathNodes if built, else array fallback */
    if (result->pathListHead) {
        PathNode* curr = result->pathListHead;
        while (curr) {
            printf("%s", curr->stopName);
            if (curr->next) {
                printf(" -> ");
            }
            curr = curr->next;
        }
        printf("\n");
    } else {
        for (int i = 0; i < result->totalStops; i++) {
            int idx = result->stopIndices[i];
            printf("%s", graph->vertices[idx].name);
            if (i < result->totalStops - 1) {
                printf(" -> ");
            }
        }
        printf("\n");
    }

    printf("\nTotal Stops: %d\n", result->totalStops);
    printf("Transfers: %d\n", result->transfers);
    printf("Estimated Distance: %g km\n", result->totalDistance);
    printf("Estimated Time: %d minutes\n", result->estimatedTimeMinutes);
}

/**
 * @brief Checks if two RouteResult structures contain the exact same sequence of stops.
 */
int areRoutesIdentical(const RouteResult* r1, const RouteResult* r2) {
    if (!r1 || !r2) return 0;
    if (!r1->found || !r2->found) return 0;
    if (r1->totalStops != r2->totalStops) return 0;

    for (int i = 0; i < r1->totalStops; i++) {
        if (r1->stopIds[i] != r2->stopIds[i]) {
            return 0;
        }
    }
    return 1;
}

/* ============================================================================
 * ALGORITHM 1: BREADTH-FIRST SEARCH (MINIMUM NUMBER OF STOPS)
 * ============================================================================ */

/**
 * @brief Finds the route with the minimum number of stops using BFS and a FIFO Queue.
 */
RouteResult findMinStopsPathBFS(const Graph* graph, int srcId, int destId) {
    RouteResult res;
    memset(&res, 0, sizeof(RouteResult));
    res.found = 0;
    res.pathListHead = NULL;

    if (!graph || graph->numVertices == 0) return res;

    int srcIdx = findVertexIndexById(graph, srcId);
    int destIdx = findVertexIndexById(graph, destId);
    if (srcIdx == -1 || destIdx == -1) return res;

    /* Trivial case: Source and destination are the same stop */
    if (srcIdx == destIdx) {
        res.found = 1;
        res.totalStops = 1;
        res.stopIndices[0] = srcIdx;
        res.stopIds[0] = srcId;
        res.totalDistance = 0.0f;
        buildRouteLinkedList(graph, &res);
        return res;
    }

    int cap = graph->capacity;
    int* visited = (int*)calloc((size_t)cap, sizeof(int));
    int* parent = (int*)malloc((size_t)cap * sizeof(int));
    Queue* queue = createQueue();

    if (!visited || !parent || !queue) {
        free(visited);
        free(parent);
        freeQueue(queue);
        return res;
    }

    for (int i = 0; i < cap; i++) {
        parent[i] = -1;
    }

    /* Start BFS from srcIdx */
    visited[srcIdx] = 1;
    enqueue(queue, srcIdx);

    int reached = 0;
    while (!isQueueEmpty(queue)) {
        int u = dequeue(queue);
        if (u == destIdx) {
            reached = 1;
            break;
        }

        AdjListNode* edge = graph->vertices[u].head;
        while (edge) {
            int v = edge->destIndex;
            if (graph->vertices[v].active && !visited[v]) {
                visited[v] = 1;
                parent[v] = u;
                enqueue(queue, v);
            }
            edge = edge->next;
        }
    }

    if (reached) {
        /* Reconstruct path backwards from destIdx to srcIdx */
        int tempStack[MAX_PATH_LEN];
        int count = 0;
        int curr = destIdx;
        while (curr != -1 && count < MAX_PATH_LEN) {
            tempStack[count++] = curr;
            curr = parent[curr];
        }

        res.found = 1;
        res.totalStops = count;
        res.totalDistance = 0.0f;

        /* Reverse into forward order and sum actual edge distances */
        for (int i = 0; i < count; i++) {
            int vIdx = tempStack[count - 1 - i];
            res.stopIndices[i] = vIdx;
            res.stopIds[i] = graph->vertices[vIdx].id;
            if (i > 0) {
                float w = getEdgeWeight(graph, res.stopIndices[i - 1], vIdx);
                if (w > 0.0f) res.totalDistance += w;
            }
        }
        buildRouteLinkedList(graph, &res);
    }

    free(visited);
    free(parent);
    freeQueue(queue);
    return res;
}

/* ============================================================================
 * ALGORITHM 2: DIJKSTRA'S ALGORITHM WITH CUSTOM BINARY MIN-HEAP
 * ============================================================================ */

/**
 * @brief Finds the shortest-distance route between srcId and destId
 *        using Dijkstra's algorithm and the custom Binary Min-Heap.
 */
RouteResult findShortestPathDijkstra(const Graph* graph, int srcId, int destId) {
    RouteResult res;
    memset(&res, 0, sizeof(RouteResult));
    res.found = 0;
    res.pathListHead = NULL;

    if (!graph || graph->numVertices == 0) return res;

    int srcIdx = findVertexIndexById(graph, srcId);
    int destIdx = findVertexIndexById(graph, destId);
    if (srcIdx == -1 || destIdx == -1) return res;

    if (srcIdx == destIdx) {
        res.found = 1;
        res.totalStops = 1;
        res.stopIndices[0] = srcIdx;
        res.stopIds[0] = srcId;
        res.totalDistance = 0.0f;
        buildRouteLinkedList(graph, &res);
        return res;
    }

    int cap = graph->capacity;
    float* dist = (float*)malloc((size_t)cap * sizeof(float));
    int* visited = (int*)calloc((size_t)cap, sizeof(int));
    int* parent = (int*)malloc((size_t)cap * sizeof(int));
    MinHeap* minHeap = createMinHeap(cap);

    if (!dist || !visited || !parent || !minHeap) {
        free(dist);
        free(visited);
        free(parent);
        freeMinHeap(minHeap);
        return res;
    }

    /* Initialize distance array and insert all active vertices into Min-Heap */
    for (int v = 0; v < cap; v++) {
        dist[v] = INF_DISTANCE;
        parent[v] = -1;
        if (graph->vertices[v].active) {
            insertMinHeap(minHeap, v, dist[v]);
        }
    }

    /* Set distance of source vertex to 0 and bubble it to top of Min-Heap */
    dist[srcIdx] = 0.0f;
    decreaseKey(minHeap, srcIdx, 0.0f);

    while (!isHeapEmpty(minHeap)) {
        MinHeapNode* minNode = extractMin(minHeap);
        if (!minNode) break;

        int u = minNode->vertexIndex;
        free(minNode);

        /* If smallest tentative distance is infinity, remaining nodes are unreachable */
        if (dist[u] >= INF_DISTANCE) {
            break;
        }

        visited[u] = 1;

        /* Early exit optimization once destination is settled */
        if (u == destIdx) {
            break;
        }

        /* Relax all adjacent edges of u */
        AdjListNode* edge = graph->vertices[u].head;
        while (edge) {
            int v = edge->destIndex;
            if (graph->vertices[v].active &&
                !visited[v] &&
                isInMinHeap(minHeap, v) &&
                dist[u] + edge->distance < dist[v]) {

                dist[v] = dist[u] + edge->distance;
                parent[v] = u;
                decreaseKey(minHeap, v, dist[v]);
            }
            edge = edge->next;
        }
    }

    /* Reconstruct shortest route if destination was reached */
    if (dist[destIdx] < INF_DISTANCE) {
        int tempStack[MAX_PATH_LEN];
        int count = 0;
        int curr = destIdx;
        while (curr != -1 && count < MAX_PATH_LEN) {
            tempStack[count++] = curr;
            curr = parent[curr];
        }

        res.found = 1;
        res.totalStops = count;
        res.totalDistance = dist[destIdx];

        for (int i = 0; i < count; i++) {
            int vIdx = tempStack[count - 1 - i];
            res.stopIndices[i] = vIdx;
            res.stopIds[i] = graph->vertices[vIdx].id;
        }
        buildRouteLinkedList(graph, &res);
    }

    free(dist);
    free(visited);
    free(parent);
    freeMinHeap(minHeap);
    return res;
}

/* ============================================================================
 * ALGORITHM 3: ALTERNATIVE ROUTE GENERATION
 * (Edge-Removal Penalty / Yen's Simplified K-Shortest Paths + DFS Backup)
 * ============================================================================ */

/**
 * @brief Helper to temporarily modify an undirected edge's weight in place.
 */
static void setUndirectedEdgeWeight(Graph* graph, int uIdx, int vIdx, float newWeight) {
    AdjListNode* curr = graph->vertices[uIdx].head;
    while (curr) {
        if (curr->destIndex == vIdx) {
            curr->distance = newWeight;
            break;
        }
        curr = curr->next;
    }
    curr = graph->vertices[vIdx].head;
    while (curr) {
        if (curr->destIndex == uIdx) {
            curr->distance = newWeight;
            break;
        }
        curr = curr->next;
    }
}

/**
 * @brief Backtracking DFS helper to discover additional simple paths if
 *        single-edge removal from the shortest path yields fewer than 2 alternatives.
 */
static void dfsCollectSimplePaths(const Graph* graph, int currIdx, int destIdx,
                                  int visited[], int pathIndices[], int pathLen,
                                  float currDist, const RouteResult* primaryRoute,
                                  RouteResult results[], int* foundCount, int maxResults) {
    if (*foundCount >= maxResults) return;

    if (currIdx == destIdx) {
        RouteResult candidate;
        memset(&candidate, 0, sizeof(RouteResult));
        candidate.found = 1;
        candidate.totalStops = pathLen;
        candidate.totalDistance = currDist;
        for (int i = 0; i < pathLen; i++) {
            candidate.stopIndices[i] = pathIndices[i];
            candidate.stopIds[i] = graph->vertices[pathIndices[i]].id;
        }

        /* Skip if identical to primary shortest route or any already collected alternative */
        if (areRoutesIdentical(&candidate, primaryRoute)) return;
        for (int k = 0; k < *foundCount; k++) {
            if (areRoutesIdentical(&candidate, &results[k])) return;
        }

        buildRouteLinkedList(graph, &candidate);
        results[*foundCount] = candidate;
        (*foundCount)++;
        return;
    }

    AdjListNode* edge = graph->vertices[currIdx].head;
    while (edge) {
        int nextIdx = edge->destIndex;
        if (graph->vertices[nextIdx].active && !visited[nextIdx] && pathLen < MAX_PATH_LEN) {
            visited[nextIdx] = 1;
            pathIndices[pathLen] = nextIdx;

            dfsCollectSimplePaths(graph, nextIdx, destIdx, visited,
                                  pathIndices, pathLen + 1,
                                  currDist + edge->distance,
                                  primaryRoute, results, foundCount, maxResults);

            visited[nextIdx] = 0;
        }
        edge = edge->next;
    }
}

/**
 * @brief Generates distinct alternative routes between srcId and destId.
 *
 * Method (Simplified Alternative Route Generation):
 *   Step 1 (Option A): Finds the primary shortest route via Dijkstra. Then iteratively
 *          temporarily disables one edge at a time along the primary route and re-runs
 *          Dijkstra to find alternative detours.
 *   Step 2 (Option B fallback): If single-edge removal finds fewer than maxResults
 *          alternatives, performs bounded DFS simple-path enumeration to discover
 *          remaining valid non-duplicate routes, then sorts alternatives by distance.
 *
 * @return Number of alternative routes stored in results[] (excluding the primary route,
 *         or including all distinct routes found). Here results[0] is Primary Best Route
 *         and results[1..count-1] are Alternative Routes, or results[] holds all distinct
 *         routes sorted by distance. Let's store ALL distinct routes starting with the
 *         best route at results[0] and alternatives at results[1..], and clearly label them!
 */
int findAlternativeRoutes(Graph* graph, int srcId, int destId,
                          RouteResult results[], int maxResults) {
    if (!graph || !results || maxResults <= 0) return 0;

    RouteResult primary = findShortestPathDijkstra(graph, srcId, destId);
    if (!primary.found) {
        return 0;
    }

    int count = 0;
    results[count++] = primary;

    /* Step 1 (Option A): Remove each edge from the best route one by one & run Dijkstra */
    for (int i = 0; i < primary.totalStops - 1 && count < maxResults; i++) {
        int uIdx = primary.stopIndices[i];
        int vIdx = primary.stopIndices[i + 1];
        float originalWeight = getEdgeWeight(graph, uIdx, vIdx);

        if (originalWeight <= 0.0f) continue;

        /* Temporarily disable edge (uIdx, vIdx) by setting weight to INF_DISTANCE */
        setUndirectedEdgeWeight(graph, uIdx, vIdx, INF_DISTANCE);

        RouteResult alt = findShortestPathDijkstra(graph, srcId, destId);

        /* Restore original edge weight immediately */
        setUndirectedEdgeWeight(graph, uIdx, vIdx, originalWeight);

        if (alt.found) {
            int isDuplicate = 0;
            for (int k = 0; k < count; k++) {
                if (areRoutesIdentical(&alt, &results[k])) {
                    isDuplicate = 1;
                    break;
                }
            }
            if (!isDuplicate) {
                results[count++] = alt;
            } else {
                freeRouteLinkedList(&alt);
            }
        }
    }

    /* Step 2 (Option B): If still fewer than maxResults, run DFS path enumeration */
    if (count < maxResults) {
        int srcIdx = findVertexIndexById(graph, srcId);
        int destIdx = findVertexIndexById(graph, destId);
        int* visited = (int*)calloc((size_t)graph->capacity, sizeof(int));
        int pathIndices[MAX_PATH_LEN];

        if (visited && srcIdx != -1 && destIdx != -1) {
            visited[srcIdx] = 1;
            pathIndices[0] = srcIdx;
            dfsCollectSimplePaths(graph, srcIdx, destIdx, visited,
                                  pathIndices, 1, 0.0f, &primary,
                                  results, &count, maxResults);
        }
        free(visited);
    }

    /* Sort all discovered distinct routes in ascending order of totalDistance */
    for (int i = 0; i < count - 1; i++) {
        for (int j = i + 1; j < count; j++) {
            if (results[j].totalDistance < results[i].totalDistance ||
               (results[j].totalDistance == results[i].totalDistance &&
                results[j].totalStops < results[i].totalStops)) {
                RouteResult temp = results[i];
                results[i] = results[j];
                results[j] = temp;
            }
        }
    }

    return count;
}
