#ifndef GRAPH_H
#define GRAPH_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

/* ============================================================================
 * CONSTANTS & CONFIGURATION MACROS
 * ============================================================================ */
#define MAX_STOP_NAME 50
#define MAX_STOPS 200
#define MAX_PATH_LEN 200
#define INF_DISTANCE 1e9f
#define DEFAULT_BUS_SPEED 25.0f   /* Average bus speed in km/h */

/* ============================================================================
 * DATA STRUCTURES FOR GRAPH REPRESENTATION (ADJACENCY LIST)
 * ============================================================================ */

/**
 * @brief Singly linked list node representing a direct bus connection (edge).
 */
typedef struct AdjListNode {
    int destIndex;              /* Internal array index of destination vertex */
    int destStopId;             /* Public Stop ID of destination vertex */
    float distance;             /* Edge weight: Distance in kilometers */
    struct AdjListNode* next;   /* Pointer to next neighbor in adjacency list */
} AdjListNode;

/**
 * @brief Singly linked list node used to reconstruct and store a route path.
 */
typedef struct PathNode {
    int stopId;                 /* Stop ID in the route sequence */
    char stopName[MAX_STOP_NAME];
    struct PathNode* next;
} PathNode;

/**
 * @brief Structure representing a single Bus Stop (Vertex) in the network.
 */
typedef struct {
    int id;                     /* Unique user-facing Bus Stop ID (e.g., 1, 2) */
    char name[MAX_STOP_NAME];   /* Bus Stop Name (e.g., "College", "Library") */
    int active;                 /* 1 if this vertex slot is active, 0 if deleted */
    AdjListNode* head;          /* Head pointer of the adjacency linked list */
} Vertex;

/**
 * @brief Main Graph structure holding all bus stops and connections.
 */
typedef struct {
    int numVertices;            /* Current count of active bus stops */
    int capacity;               /* Maximum allocated vertex slots */
    float avgSpeedKmph;         /* Average bus speed in km/h (default 25.0) */
    Vertex* vertices;           /* Dynamic array of Vertex structures */
} Graph;

/**
 * @brief Encapsulates a computed route's metrics and sequence of stops.
 */
typedef struct {
    int stopIds[MAX_PATH_LEN];  /* Ordered array of Stop IDs from Src to Dest */
    int stopIndices[MAX_PATH_LEN]; /* Ordered internal indices */
    int totalStops;             /* Number of stops in the route */
    int transfers;              /* Number of intermediate transfers (stops - 2) */
    float totalDistance;        /* Total route distance in kilometers */
    int estimatedTimeMinutes;   /* Rounded travel time in minutes */
    int found;                  /* 1 if a valid route was found, 0 otherwise */
    PathNode* pathListHead;     /* Linked list representation of the final path */
} RouteResult;

/* ============================================================================
 * CORE GRAPH MANAGEMENT PROTOTYPES
 * ============================================================================ */

Graph* createGraph(int capacity);
void freeGraph(Graph* graph);
void clearGraph(Graph* graph);

int findVertexIndexById(const Graph* graph, int stopId);
int findVertexIndexByName(const Graph* graph, const char* name);

int addBusStop(Graph* graph, int stopId, const char* name);
int deleteBusStop(Graph* graph, int stopId);

int addBusConnection(Graph* graph, int srcId, int destId, float distance);
int removeBusConnection(Graph* graph, int srcId, int destId);
float getEdgeWeight(const Graph* graph, int srcIndex, int destIndex);

/* ============================================================================
 * DISPLAY & TRAVERSAL PROTOTYPES
 * ============================================================================ */

void displayAllBusStops(const Graph* graph);
void displayTransportNetwork(const Graph* graph);

/* ============================================================================
 * ROUTE PLANNING ALGORITHM PROTOTYPES
 * ============================================================================ */

RouteResult findShortestPathDijkstra(const Graph* graph, int srcId, int destId);
RouteResult findMinStopsPathBFS(const Graph* graph, int srcId, int destId);

int findAlternativeRoutes(Graph* graph, int srcId, int destId,
                          RouteResult results[], int maxResults);

/* ============================================================================
 * ROUTE PATH LINKED LIST & FORMATTING HELPERS
 * ============================================================================ */

void buildRouteLinkedList(const Graph* graph, RouteResult* result);
void freeRouteLinkedList(RouteResult* result);
void printRouteResult(const Graph* graph, const RouteResult* result, const char* title);
int areRoutesIdentical(const RouteResult* r1, const RouteResult* r2);

/* String case-insensitive comparison utility */
int strCaseCompare(const char* s1, const char* s2);

#endif /* GRAPH_H */
