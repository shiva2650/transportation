#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#include "graph.h"
#include "heap.h"
#include "hashtable.h"
#include "queue.h"
#include "fileio.h"

/* ============================================================================
 * SAFE INPUT READING & VALIDATION UTILITIES
 * ============================================================================ */

/**
 * @brief Safely reads a single line from stdin using fgets() and trims CR/LF.
 */
static int readLineSafe(const char* prompt, char* buffer, size_t maxLen) {
    if (prompt) {
        printf("%s", prompt);
        fflush(stdout);
    }

    if (!fgets(buffer, (int)maxLen, stdin)) {
        buffer[0] = '\0';
        return 0;
    }

    /* Check if newline was read; if not, flush remaining characters on line */
    size_t len = strlen(buffer);
    if (len > 0 && buffer[len - 1] == '\n') {
        buffer[len - 1] = '\0';
        len--;
        if (len > 0 && buffer[len - 1] == '\r') {
            buffer[len - 1] = '\0';
            len--;
        }
    } else {
        int ch;
        while ((ch = getchar()) != '\n' && ch != EOF) {
            /* Discard overflow characters to prevent buffer overflow */
        }
    }

    /* Trim leading and trailing whitespace */
    size_t start = 0;
    while (buffer[start] && isspace((unsigned char)buffer[start])) {
        start++;
    }
    if (start > 0) {
        memmove(buffer, buffer + start, len - start + 1);
        len -= start;
    }
    while (len > 0 && isspace((unsigned char)buffer[len - 1])) {
        buffer[len - 1] = '\0';
        len--;
    }

    return 1;
}

/**
 * @brief Safely reads an integer from the user with validation.
 */
static int readIntSafe(const char* prompt, int* outVal) {
    char buf[128];
    if (!readLineSafe(prompt, buf, sizeof(buf)) || buf[0] == '\0') {
        return 0;
    }
    char extra;
    if (sscanf(buf, "%d %c", outVal, &extra) == 1) {
        return 1;
    }
    return 0;
}

/**
 * @brief Safely reads a floating-point number from the user with validation.
 */
static int readFloatSafe(const char* prompt, float* outVal) {
    char buf[128];
    if (!readLineSafe(prompt, buf, sizeof(buf)) || buf[0] == '\0') {
        return 0;
    }
    char extra;
    if (sscanf(buf, "%f %c", outVal, &extra) == 1) {
        return 1;
    }
    return 0;
}

/**
 * @brief Resolves a user input string (either numeric Stop ID or Stop Name)
 *        into a valid Stop ID using O(1) average Hash Table lookups.
 * @return Valid Stop ID (> 0) if found, or -1 if not found.
 */
static int resolveStopInput(const HashTable* ht, const char* prompt) {
    char input[128];
    if (!readLineSafe(prompt, input, sizeof(input)) || input[0] == '\0') {
        return -1;
    }

    /* Check if user entered a purely numeric Stop ID */
    int idCandidate = 0;
    char extra;
    if (sscanf(input, "%d %c", &idCandidate, &extra) == 1 && idCandidate > 0) {
        HashNode* node = hashSearchById(ht, idCandidate);
        if (node) {
            return node->stopId;
        }
    }

    /* Otherwise search by Stop Name in the Hash Table */
    HashNode* node = hashSearchByName(ht, input);
    if (node) {
        return node->stopId;
    }

    return -1;
}

/* ============================================================================
 * MENU ACTION HANDLERS
 * ============================================================================ */

/**
 * @brief Option 1: Add Bus Stop (or Delete an existing Bus Stop).
 */
static void handleAddOrManageBusStop(Graph* graph, HashTable* ht) {
    printf("\n--- Bus Stop Management ---\n");
    printf("1. Add a New Bus Stop\n");
    printf("2. Delete an Existing Bus Stop\n");
    int subChoice = 1;
    if (!readIntSafe("Select action (1 to Add, 2 to Delete) [Default 1]: ", &subChoice)) {
        subChoice = 1;
    }

    if (subChoice == 2) {
        if (graph->numVertices == 0) {
            printf("\n[Error] No bus stops available to delete.\n");
            return;
        }
        int stopId = resolveStopInput(ht, "Enter Stop ID or Stop Name to delete: ");
        if (stopId == -1) {
            printf("\n[Error] Bus stop not found in the network.\n");
            return;
        }
        int vIdx = findVertexIndexById(graph, stopId);
        char deletedName[MAX_STOP_NAME];
        strncpy(deletedName, graph->vertices[vIdx].name, MAX_STOP_NAME - 1);
        deletedName[MAX_STOP_NAME - 1] = '\0';

        if (deleteBusStop(graph, stopId)) {
            hashDelete(ht, stopId, deletedName);
            printf("\n[Success] Bus Stop '%s' (ID: %d) and its connections were deleted.\n",
                   deletedName, stopId);
        } else {
            printf("\n[Error] Could not delete bus stop.\n");
        }
        return;
    }

    /* Default: Add a new Bus Stop */
    int stopId = 0;
    if (!readIntSafe("Enter New Bus Stop ID (positive integer): ", &stopId) || stopId <= 0) {
        printf("\n[Error] Invalid Stop ID. Must be a positive integer.\n");
        return;
    }

    if (hashSearchById(ht, stopId) != NULL) {
        printf("\n[Error] Duplicate Stop ID! Stop ID %d already exists.\n", stopId);
        return;
    }

    char stopName[MAX_STOP_NAME];
    if (!readLineSafe("Enter Bus Stop Name: ", stopName, sizeof(stopName)) ||
        strlen(stopName) == 0) {
        printf("\n[Error] Bus Stop Name cannot be empty.\n");
        return;
    }

    if (hashSearchByName(ht, stopName) != NULL) {
        printf("\n[Error] Duplicate Stop Name! '%s' already exists in the network.\n", stopName);
        return;
    }

    int vIdx = addBusStop(graph, stopId, stopName);
    if (vIdx >= 0) {
        hashInsert(ht, stopId, stopName, vIdx);
        printf("\n[Success] Added Bus Stop: [%d] %s\n", stopId, stopName);
    } else if (vIdx == -2) {
        printf("\n[Error] Network capacity (%d stops) is full.\n", graph->capacity);
    } else {
        printf("\n[Error] Failed to add bus stop.\n");
    }
}

/**
 * @brief Option 2: Add Bus Route (or Remove an existing Bus Connection).
 */
static void handleAddOrManageBusRoute(Graph* graph, const HashTable* ht) {
    if (graph->numVertices < 2) {
        printf("\n[Error] At least 2 bus stops are required before managing routes.\n");
        return;
    }

    printf("\n--- Bus Route (Connection) Management ---\n");
    printf("1. Add / Update Direct Bus Connection\n");
    printf("2. Remove Direct Bus Connection\n");
    int subChoice = 1;
    if (!readIntSafe("Select action (1 to Add, 2 to Remove) [Default 1]: ", &subChoice)) {
        subChoice = 1;
    }

    int srcId = resolveStopInput(ht, "Enter Source Stop (ID or Name): ");
    if (srcId == -1) {
        printf("\n[Error] Source bus stop not found.\n");
        return;
    }

    int destId = resolveStopInput(ht, "Enter Destination Stop (ID or Name): ");
    if (destId == -1) {
        printf("\n[Error] Destination bus stop not found.\n");
        return;
    }

    if (srcId == destId) {
        printf("\n[Error] Self-loops are not allowed (Source and Destination are identical).\n");
        return;
    }

    int srcIdx = findVertexIndexById(graph, srcId);
    int destIdx = findVertexIndexById(graph, destId);

    if (subChoice == 2) {
        if (removeBusConnection(graph, srcId, destId)) {
            printf("\n[Success] Removed direct bus route between %s and %s.\n",
                   graph->vertices[srcIdx].name, graph->vertices[destIdx].name);
        } else {
            printf("\n[Error] No direct connection exists between %s and %s.\n",
                   graph->vertices[srcIdx].name, graph->vertices[destIdx].name);
        }
        return;
    }

    float distance = 0.0f;
    if (!readFloatSafe("Enter Distance in km (> 0): ", &distance) || distance <= 0.0f) {
        printf("\n[Error] Invalid distance. Distance must be a positive number.\n");
        return;
    }

    int status = addBusConnection(graph, srcId, destId, distance);
    if (status == 1) {
        printf("\n[Success] Added direct route: %s <-> %s (%g km)\n",
               graph->vertices[srcIdx].name, graph->vertices[destIdx].name, distance);
    } else if (status == 2) {
        printf("\n[Success] Updated existing route distance: %s <-> %s (%g km)\n",
               graph->vertices[srcIdx].name, graph->vertices[destIdx].name, distance);
    } else {
        printf("\n[Error] Could not add bus connection.\n");
    }
}

/**
 * @brief Option 4: Search Bus Stop using the Custom Separate Chaining Hash Table.
 */
static void handleSearchBusStop(const Graph* graph, const HashTable* ht) {
    if (graph->numVertices == 0) {
        printf("\n[Info] The transport network is currently empty.\n");
        return;
    }

    printf("\n--- Fast Bus Stop Lookup (Custom Hash Table) ---\n");
    printf("1. Search by Stop ID or Stop Name\n");
    printf("2. Display Internal Hash Table Buckets & Chains\n");
    int mode = 1;
    if (!readIntSafe("Select option [Default 1]: ", &mode)) {
        mode = 1;
    }

    if (mode == 2) {
        displayHashTable(ht);
        return;
    }

    char query[128];
    if (!readLineSafe("Enter Stop ID or Stop Name to search: ", query, sizeof(query)) ||
        query[0] == '\0') {
        printf("\n[Error] Empty search query.\n");
        return;
    }

    HashNode* foundNode = NULL;
    int idQuery = 0;
    char extra;
    if (sscanf(query, "%d %c", &idQuery, &extra) == 1 && idQuery > 0) {
        foundNode = hashSearchById(ht, idQuery);
    }
    if (!foundNode) {
        foundNode = hashSearchByName(ht, query);
    }

    if (!foundNode) {
        printf("\n[Result] Bus stop '%s' was NOT found in the hash table.\n", query);
        return;
    }

    int vIdx = findVertexIndexById(graph, foundNode->stopId);
    printf("\n============================================\n");
    printf(" BUS STOP FOUND IN HASH TABLE (O(1) Lookup)\n");
    printf("============================================\n");
    printf(" Stop ID          : %d\n", foundNode->stopId);
    printf(" Stop Name        : %s\n", foundNode->stopName);
    printf(" Hash Bucket (ID) : %u\n", hashById(foundNode->stopId, ht->numBuckets));
    printf(" Hash Bucket(Name): %u\n", hashByName(foundNode->stopName, ht->numBuckets));

    if (vIdx != -1) {
        printf(" Direct Connections: ");
        AdjListNode* edge = graph->vertices[vIdx].head;
        if (!edge) {
            printf("None");
        }
        while (edge) {
            printf("%s (%g km)", graph->vertices[edge->destIndex].name, edge->distance);
            if (edge->next) printf(", ");
            edge = edge->next;
        }
        printf("\n");
    }
    printf("============================================\n");
}

/**
 * @brief Option 5: Find Shortest Distance Route using Dijkstra's Algorithm + Min-Heap.
 */
static void handleShortestDistanceRoute(const Graph* graph, const HashTable* ht) {
    if (graph->numVertices < 2) {
        printf("\n[Error] Network has fewer than 2 bus stops.\n");
        return;
    }

    int srcId = resolveStopInput(ht, "Enter Source Stop (ID or Name): ");
    if (srcId == -1) {
        printf("\n[Error] Source bus stop not found.\n");
        return;
    }

    int destId = resolveStopInput(ht, "Enter Destination Stop (ID or Name): ");
    if (destId == -1) {
        printf("\n[Error] Destination bus stop not found.\n");
        return;
    }

    RouteResult res = findShortestPathDijkstra(graph, srcId, destId);
    printRouteResult(graph, &res, "Available Route:");
    freeRouteLinkedList(&res);
}

/**
 * @brief Option 6: Find Minimum Stops Route using BFS + Custom Queue.
 */
static void handleMinimumStopsRoute(const Graph* graph, const HashTable* ht) {
    if (graph->numVertices < 2) {
        printf("\n[Error] Network has fewer than 2 bus stops.\n");
        return;
    }

    int srcId = resolveStopInput(ht, "Enter Source Stop (ID or Name): ");
    if (srcId == -1) {
        printf("\n[Error] Source bus stop not found.\n");
        return;
    }

    int destId = resolveStopInput(ht, "Enter Destination Stop (ID or Name): ");
    if (destId == -1) {
        printf("\n[Error] Destination bus stop not found.\n");
        return;
    }

    RouteResult res = findMinStopsPathBFS(graph, srcId, destId);
    printRouteResult(graph, &res, "Available Route:");
    freeRouteLinkedList(&res);
}

/**
 * @brief Option 7: Display Alternative Routes (Edge-Removal Dijkstra + DFS Fallback).
 */
static void handleAlternativeRoutes(Graph* graph, const HashTable* ht) {
    if (graph->numVertices < 2) {
        printf("\n[Error] Network has fewer than 2 bus stops.\n");
        return;
    }

    int srcId = resolveStopInput(ht, "Enter Source Stop (ID or Name): ");
    if (srcId == -1) {
        printf("\n[Error] Source bus stop not found.\n");
        return;
    }

    int destId = resolveStopInput(ht, "Enter Destination Stop (ID or Name): ");
    if (destId == -1) {
        printf("\n[Error] Destination bus stop not found.\n");
        return;
    }

    RouteResult routes[10];
    int count = findAlternativeRoutes(graph, srcId, destId, routes, 5);

    if (count == 0) {
        printf("\nNo route exists between the selected bus stops.\n");
        return;
    }

    printf("\n[Note: Generated using Simplified Edge-Removal Dijkstra + DFS Path Enumeration]\n");

    for (int i = 0; i < count; i++) {
        char header[64];
        if (i == 0) {
            snprintf(header, sizeof(header), "Available Route (Primary Shortest Route):");
        } else {
            snprintf(header, sizeof(header), "Available Route (Alternative Route %d):", i);
        }
        printRouteResult(graph, &routes[i], header);
        printf("--------------------------------------------\n");
        freeRouteLinkedList(&routes[i]);
    }
}

/**
 * @brief Option 9: Save Transport Network to a text file.
 */
static void handleSaveNetwork(const Graph* graph) {
    char filename[128];
    readLineSafe("Enter filename to save [Press Enter for 'network.txt']: ",
                 filename, sizeof(filename));
    if (strlen(filename) == 0) {
        strcpy(filename, DEFAULT_NETWORK_FILE);
    }

    if (saveNetworkToFile(graph, filename)) {
        printf("\n[Success] Transport network saved successfully to '%s'.\n", filename);
    } else {
        printf("\n[Error] Failed to save transport network to '%s'.\n", filename);
    }
}

/**
 * @brief Option 10: Load Transport Network from a text file.
 */
static void handleLoadNetwork(Graph* graph, HashTable* ht) {
    char filename[128];
    readLineSafe("Enter filename to load [Press Enter for 'network.txt']: ",
                 filename, sizeof(filename));
    if (strlen(filename) == 0) {
        strcpy(filename, DEFAULT_NETWORK_FILE);
    }

    if (loadNetworkFromFile(graph, ht, filename)) {
        printf("\n[Success] Transport network loaded from '%s' (%d stops active).\n",
               filename, graph->numVertices);
    } else {
        printf("\n[Error] Could not load '%s'. Restoring built-in sample network.\n", filename);
        loadBuiltInSampleNetwork(graph, ht);
    }
}

/* ============================================================================
 * REQUIRED MENU DISPLAY & MAIN ENTRY POINT
 * ============================================================================ */

static void displayMenu(void) {
    printf("\n====================================\n");
    printf(" SMART PUBLIC TRANSPORT ROUTE PLANNER\n");
    printf("====================================\n\n");
    printf("1. Add Bus Stop\n");
    printf("2. Add Bus Route\n");
    printf("3. Display All Bus Stops\n");
    printf("4. Search Bus Stop\n");
    printf("5. Find Shortest Distance Route\n");
    printf("6. Find Minimum Stops Route\n");
    printf("7. Display Alternative Routes\n");
    printf("8. Display Transport Network\n");
    printf("9. Save Transport Network\n");
    printf("10. Load Transport Network\n");
    printf("11. Exit\n\n");
    printf("Enter Your Choice: ");
    fflush(stdout);
}

int main(void) {
    Graph* graph = createGraph(MAX_STOPS);
    HashTable* ht = createHashTable(HASH_TABLE_SIZE);

    if (!graph || !ht) {
        fprintf(stderr, "Fatal Error: Could not initialize application memory.\n");
        freeGraph(graph);
        freeHashTable(ht);
        return EXIT_FAILURE;
    }

    /* Automatically load the mandatory 6-stop, 7-connection sample network */
    loadBuiltInSampleNetwork(graph, ht);
    /* Also create default network.txt so Option 10 works out-of-the-box */
    saveNetworkToFile(graph, DEFAULT_NETWORK_FILE);

    printf("============================================================\n");
    printf("  Built-in Sample Network Loaded (6 Stops, 7 Connections)\n");
    printf("  Average Bus Speed: %g km/h\n", graph->avgSpeedKmph);
    printf("============================================================\n");

    int running = 1;
    while (running) {
        displayMenu();

        int choice = 0;
        if (!readIntSafe(NULL, &choice)) {
            printf("\n[Error] Invalid input. Please enter a number between 1 and 11.\n");
            continue;
        }

        switch (choice) {
            case 1:
                handleAddOrManageBusStop(graph, ht);
                break;
            case 2:
                handleAddOrManageBusRoute(graph, ht);
                break;
            case 3:
                displayAllBusStops(graph);
                break;
            case 4:
                handleSearchBusStop(graph, ht);
                break;
            case 5:
                handleShortestDistanceRoute(graph, ht);
                break;
            case 6:
                handleMinimumStopsRoute(graph, ht);
                break;
            case 7:
                handleAlternativeRoutes(graph, ht);
                break;
            case 8:
                displayTransportNetwork(graph);
                break;
            case 9:
                handleSaveNetwork(graph);
                break;
            case 10:
                handleLoadNetwork(graph, ht);
                break;
            case 11:
                printf("\nFreeing all allocated memory and exiting...\n");
                printf("Thank you for using Smart Public Transport Route Planner!\n");
                running = 0;
                break;
            default:
                printf("\n[Error] Invalid choice (%d). Please enter a valid option (1-11).\n", choice);
                break;
        }
    }

    /* Cleanly free all dynamically allocated memory before exit */
    freeHashTable(ht);
    freeGraph(graph);

    return EXIT_SUCCESS;
}
