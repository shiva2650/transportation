#include "fileio.h"

/* ============================================================================
 * INTERNAL HELPER FUNCTIONS
 * ============================================================================ */

/**
 * @brief Strips trailing CR/LF characters and leading/trailing spaces in-place.
 */
static void trimWhitespace(char* str) {
    if (!str) return;

    /* Trim trailing newline / whitespace */
    size_t len = strlen(str);
    while (len > 0 && isspace((unsigned char)str[len - 1])) {
        str[len - 1] = '\0';
        len--;
    }

    /* Trim leading whitespace */
    size_t start = 0;
    while (str[start] && isspace((unsigned char)str[start])) {
        start++;
    }
    if (start > 0) {
        memmove(str, str + start, len - start + 1);
    }
}

/**
 * @brief Helper to add a bus stop into both the Graph and the HashTable.
 */
static void registerSampleStop(Graph* graph, HashTable* ht, int id, const char* name) {
    int vIdx = addBusStop(graph, id, name);
    if (vIdx >= 0 && ht) {
        hashInsert(ht, id, name, vIdx);
    }
}

/* ============================================================================
 * BUILT-IN SAMPLE NETWORK LOADER
 * ============================================================================ */

/**
 * @brief Automatically populates the mandatory 6-stop, 7-connection sample
 *        transport network when the program starts.
 *
 * Stops:
 *   1 | College
 *   2 | Library
 *   3 | Market
 *   4 | Hospital
 *   5 | Railway Station
 *   6 | City Center
 *
 * Connections:
 *   College - Library : 3 km
 *   College - Market : 5 km
 *   Library - Hospital : 4 km
 *   Market - Railway Station : 2 km
 *   Hospital - City Center : 6 km
 *   Railway Station - City Center : 3 km
 *   Hospital - Railway Station : 5 km
 */
void loadBuiltInSampleNetwork(Graph* graph, HashTable* ht) {
    if (!graph || !ht) return;

    clearGraph(graph);
    clearHashTable(ht);

    /* 1. Register the 6 Sample Bus Stops */
    registerSampleStop(graph, ht, 1, "College");
    registerSampleStop(graph, ht, 2, "Library");
    registerSampleStop(graph, ht, 3, "Market");
    registerSampleStop(graph, ht, 4, "Hospital");
    registerSampleStop(graph, ht, 5, "Railway Station");
    registerSampleStop(graph, ht, 6, "City Center");

    /* 2. Register the 7 Sample Undirected Bus Connections */
    addBusConnection(graph, 1, 2, 3.0f);    /* College - Library : 3 km */
    addBusConnection(graph, 1, 3, 5.0f);    /* College - Market : 5 km */
    addBusConnection(graph, 2, 4, 4.0f);    /* Library - Hospital : 4 km */
    addBusConnection(graph, 3, 5, 2.0f);    /* Market - Railway Station : 2 km */
    addBusConnection(graph, 4, 6, 6.0f);    /* Hospital - City Center : 6 km */
    addBusConnection(graph, 5, 6, 3.0f);    /* Railway Station - City Center : 3 km */
    addBusConnection(graph, 4, 5, 5.0f);    /* Hospital - Railway Station : 5 km */
}

/* ============================================================================
 * SAVE & LOAD TRANSPORT NETWORK (PLAIN TEXT FILE I/O)
 * ============================================================================ */

/**
 * @brief Saves the transport network to a plain text file (`network.txt`).
 *
 * File Format:
 *   # SMART PUBLIC TRANSPORT NETWORK FILE
 *   STOP|1|College
 *   STOP|2|Library
 *   ...
 *   ROUTE|1|2|3
 *   ROUTE|1|3|5
 *   ...
 *
 * @return 1 on success, 0 on error.
 */
int saveNetworkToFile(const Graph* graph, const char* filename) {
    if (!graph || !filename || strlen(filename) == 0) {
        return 0;
    }

    FILE* fp = fopen(filename, "w");
    if (!fp) {
        return 0;
    }

    fprintf(fp, "# SMART PUBLIC TRANSPORT NETWORK DATA FILE\n");
    fprintf(fp, "# Format: STOP|<stop_id>|<stop_name>\n");
    fprintf(fp, "# Format: ROUTE|<src_id>|<dest_id>|<distance_km>\n\n");

    /* 1. Write all active bus stops */
    for (int i = 0; i < graph->capacity; i++) {
        if (graph->vertices[i].active) {
            fprintf(fp, "STOP|%d|%s\n",
                    graph->vertices[i].id,
                    graph->vertices[i].name);
        }
    }

    fprintf(fp, "\n");

    /* 2. Write each undirected bus route once (only when srcId < destId) */
    for (int i = 0; i < graph->capacity; i++) {
        if (!graph->vertices[i].active) continue;
        int srcId = graph->vertices[i].id;

        AdjListNode* curr = graph->vertices[i].head;
        while (curr) {
            int destId = curr->destStopId;
            if (srcId < destId) {
                fprintf(fp, "ROUTE|%d|%d|%g\n", srcId, destId, curr->distance);
            }
            curr = curr->next;
        }
    }

    fclose(fp);
    return 1;
}

/**
 * @brief Loads a transport network from a plain text file (`network.txt`),
 *        replacing the current in-memory Graph and HashTable after validation.
 * @return 1 on success, 0 if file cannot be opened or contains no valid stops.
 */
int loadNetworkFromFile(Graph* graph, HashTable* ht, const char* filename) {
    if (!graph || !ht || !filename || strlen(filename) == 0) {
        return 0;
    }

    FILE* fp = fopen(filename, "r");
    if (!fp) {
        return 0;
    }

    clearGraph(graph);
    clearHashTable(ht);

    char line[256];
    int stopsLoaded = 0;

    while (fgets(line, sizeof(line), fp) != NULL) {
        trimWhitespace(line);

        /* Skip empty lines and comment lines starting with '#' */
        if (line[0] == '\0' || line[0] == '#') {
            continue;
        }

        if (strncmp(line, "STOP|", 5) == 0) {
            char* idStr = line + 5;
            char* sep = strchr(idStr, '|');
            if (!sep) continue;

            *sep = '\0';
            char* nameStr = sep + 1;
            trimWhitespace(idStr);
            trimWhitespace(nameStr);

            int stopId = atoi(idStr);
            if (stopId > 0 && strlen(nameStr) > 0) {
                int vIdx = addBusStop(graph, stopId, nameStr);
                if (vIdx >= 0) {
                    hashInsert(ht, stopId, nameStr, vIdx);
                    stopsLoaded++;
                }
            }
        } else if (strncmp(line, "ROUTE|", 6) == 0) {
            int srcId = 0, destId = 0;
            float dist = 0.0f;
            if (sscanf(line + 6, "%d|%d|%f", &srcId, &destId, &dist) == 3) {
                if (srcId > 0 && destId > 0 && dist > 0.0f) {
                    addBusConnection(graph, srcId, destId, dist);
                }
            }
        }
    }

    fclose(fp);
    return (stopsLoaded > 0) ? 1 : 0;
}
