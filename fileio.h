#ifndef FILEIO_H
#define FILEIO_H

#include "graph.h"
#include "hashtable.h"

#define DEFAULT_NETWORK_FILE "network.txt"

/* ============================================================================
 * FILE PERSISTENCE & BUILT-IN SAMPLE NETWORK PROTOTYPES
 * ============================================================================ */

/**
 * @brief Populates the graph and hash table with the mandatory built-in
 *        6-stop, 7-connection sample transport network on startup.
 */
void loadBuiltInSampleNetwork(Graph* graph, HashTable* ht);

/**
 * @brief Saves all active bus stops and unique undirected connections
 *        to a human-readable plain text file.
 * @return 1 on success, 0 on failure.
 */
int saveNetworkToFile(const Graph* graph, const char* filename);

/**
 * @brief Loads bus stops and connections from a plain text file,
 *        rebuilding both the Graph and the HashTable.
 * @return 1 on success, 0 on failure.
 */
int loadNetworkFromFile(Graph* graph, HashTable* ht, const char* filename);

#endif /* FILEIO_H */
