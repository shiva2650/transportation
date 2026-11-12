#ifndef HASHTABLE_H
#define HASHTABLE_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define HASH_TABLE_SIZE 31      /* Prime number bucket count for uniform distribution */
#define MAX_HASH_NAME_LEN 50

/* ============================================================================
 * SEPARATE CHAINING HASH TABLE DATA STRUCTURES
 * ============================================================================ */

/**
 * @brief Singly linked list node stored inside a Hash Table bucket chain.
 */
typedef struct HashNode {
    int stopId;                         /* Unique Bus Stop ID */
    char stopName[MAX_HASH_NAME_LEN];   /* Bus Stop Name */
    int vertexIndex;                    /* Corresponding index in Graph->vertices */
    struct HashNode* next;              /* Next node in collision chain */
} HashNode;

/**
 * @brief Dual-indexed Separate Chaining Hash Table.
 *        Supports fast O(1) average lookup by both Stop ID and Stop Name.
 */
typedef struct {
    int numBuckets;                     /* Number of hash buckets (HASH_TABLE_SIZE) */
    int count;                          /* Total number of active stops indexed */
    HashNode** idBuckets;               /* Buckets hashed by integer Stop ID */
    HashNode** nameBuckets;             /* Buckets hashed by lowercase Stop Name */
} HashTable;

/* ============================================================================
 * HASH TABLE FUNCTION PROTOTYPES
 * ============================================================================ */

HashTable* createHashTable(int numBuckets);
void freeHashTable(HashTable* ht);
void clearHashTable(HashTable* ht);

unsigned int hashById(int stopId, int numBuckets);
unsigned int hashByName(const char* name, int numBuckets);

int hashInsert(HashTable* ht, int stopId, const char* stopName, int vertexIndex);
HashNode* hashSearchById(const HashTable* ht, int stopId);
HashNode* hashSearchByName(const HashTable* ht, const char* stopName);
int hashDelete(HashTable* ht, int stopId, const char* stopName);

void displayHashTable(const HashTable* ht);

#endif /* HASHTABLE_H */
