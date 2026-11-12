#include "hashtable.h"

/* ============================================================================
 * INTERNAL HELPER FUNCTIONS
 * ============================================================================ */

/**
 * @brief Portable case-insensitive string comparison for hash table keys.
 */
static int hashStrCaseCmp(const char* s1, const char* s2) {
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
 * @brief Allocates and initializes a new HashNode for separate chaining.
 */
static HashNode* createHashNode(int stopId, const char* stopName, int vertexIndex) {
    HashNode* node = (HashNode*)malloc(sizeof(HashNode));
    if (!node) {
        fprintf(stderr, "Memory Error: Failed to allocate HashNode.\n");
        return NULL;
    }
    node->stopId = stopId;
    strncpy(node->stopName, stopName, MAX_HASH_NAME_LEN - 1);
    node->stopName[MAX_HASH_NAME_LEN - 1] = '\0';
    node->vertexIndex = vertexIndex;
    node->next = NULL;
    return node;
}

/* ============================================================================
 * HASH FUNCTIONS
 * ============================================================================ */

/**
 * @brief Hash function for integer Bus Stop IDs using multiplicative hashing
 *        modulo a prime bucket count.
 */
unsigned int hashById(int stopId, int numBuckets) {
    if (numBuckets <= 0) numBuckets = HASH_TABLE_SIZE;
    unsigned int u = (unsigned int)(stopId < 0 ? -stopId : stopId);
    return (u * 2654435761U) % (unsigned int)numBuckets;
}

/**
 * @brief Polynomial rolling hash function (multiplier 31) on lowercase characters
 *        so that stop name searches are case-insensitive.
 */
unsigned int hashByName(const char* name, int numBuckets) {
    if (!name || numBuckets <= 0) return 0;
    unsigned int hashVal = 0;
    while (*name) {
        unsigned char ch = (unsigned char)tolower((unsigned char)*name);
        hashVal = (hashVal * 31U) + ch;
        name++;
    }
    return hashVal % (unsigned int)numBuckets;
}

/* ============================================================================
 * HASH TABLE LIFECYCLE & OPERATIONS
 * ============================================================================ */

/**
 * @brief Creates a dual-indexed Separate Chaining Hash Table.
 */
HashTable* createHashTable(int numBuckets) {
    if (numBuckets <= 0) numBuckets = HASH_TABLE_SIZE;

    HashTable* ht = (HashTable*)malloc(sizeof(HashTable));
    if (!ht) {
        fprintf(stderr, "Memory Error: Failed to allocate HashTable.\n");
        return NULL;
    }

    ht->numBuckets = numBuckets;
    ht->count = 0;
    ht->idBuckets = (HashNode**)calloc((size_t)numBuckets, sizeof(HashNode*));
    ht->nameBuckets = (HashNode**)calloc((size_t)numBuckets, sizeof(HashNode*));

    if (!ht->idBuckets || !ht->nameBuckets) {
        fprintf(stderr, "Memory Error: Failed to allocate HashTable buckets.\n");
        free(ht->idBuckets);
        free(ht->nameBuckets);
        free(ht);
        return NULL;
    }

    return ht;
}

/**
 * @brief Removes all chained nodes from both bucket arrays without freeing `ht`.
 */
void clearHashTable(HashTable* ht) {
    if (!ht) return;

    for (int i = 0; i < ht->numBuckets; i++) {
        HashNode* curr = ht->idBuckets[i];
        while (curr) {
            HashNode* temp = curr;
            curr = curr->next;
            free(temp);
        }
        ht->idBuckets[i] = NULL;

        curr = ht->nameBuckets[i];
        while (curr) {
            HashNode* temp = curr;
            curr = curr->next;
            free(temp);
        }
        ht->nameBuckets[i] = NULL;
    }
    ht->count = 0;
}

/**
 * @brief Frees all nodes, bucket arrays, and the HashTable structure.
 */
void freeHashTable(HashTable* ht) {
    if (!ht) return;
    clearHashTable(ht);
    free(ht->idBuckets);
    free(ht->nameBuckets);
    free(ht);
}

/**
 * @brief Inserts a bus stop into both the ID hash table and Name hash table
 *        using separate chaining at the head of the bucket list.
 * @return 1 on success, 0 if duplicate or allocation error.
 */
int hashInsert(HashTable* ht, int stopId, const char* stopName, int vertexIndex) {
    if (!ht || stopId <= 0 || !stopName || strlen(stopName) == 0) {
        return 0;
    }

    /* Prevent duplicate entries */
    if (hashSearchById(ht, stopId) != NULL || hashSearchByName(ht, stopName) != NULL) {
        return 0;
    }

    unsigned int idIdx = hashById(stopId, ht->numBuckets);
    unsigned int nameIdx = hashByName(stopName, ht->numBuckets);

    HashNode* idNode = createHashNode(stopId, stopName, vertexIndex);
    HashNode* nameNode = createHashNode(stopId, stopName, vertexIndex);

    if (!idNode || !nameNode) {
        free(idNode);
        free(nameNode);
        return 0;
    }

    /* Insert at the head of the respective separate-chaining linked lists */
    idNode->next = ht->idBuckets[idIdx];
    ht->idBuckets[idIdx] = idNode;

    nameNode->next = ht->nameBuckets[nameIdx];
    ht->nameBuckets[nameIdx] = nameNode;

    ht->count++;
    return 1;
}

/**
 * @brief Searches for a bus stop by its numeric Stop ID in O(1) average time.
 */
HashNode* hashSearchById(const HashTable* ht, int stopId) {
    if (!ht || stopId <= 0) return NULL;

    unsigned int idIdx = hashById(stopId, ht->numBuckets);
    HashNode* curr = ht->idBuckets[idIdx];

    while (curr) {
        if (curr->stopId == stopId) {
            return curr;
        }
        curr = curr->next;
    }
    return NULL;
}

/**
 * @brief Searches for a bus stop by its Stop Name (case-insensitive) in O(1) average time.
 */
HashNode* hashSearchByName(const HashTable* ht, const char* stopName) {
    if (!ht || !stopName || strlen(stopName) == 0) return NULL;

    unsigned int nameIdx = hashByName(stopName, ht->numBuckets);
    HashNode* curr = ht->nameBuckets[nameIdx];

    while (curr) {
        if (hashStrCaseCmp(curr->stopName, stopName) == 0) {
            return curr;
        }
        curr = curr->next;
    }
    return NULL;
}

/**
 * @brief Deletes a bus stop from both the ID bucket chain and Name bucket chain.
 * @return 1 if deleted, 0 if not found.
 */
int hashDelete(HashTable* ht, int stopId, const char* stopName) {
    if (!ht || stopId <= 0 || !stopName) return 0;

    int deletedId = 0;
    int deletedName = 0;

    /* 1. Delete from ID bucket chain */
    unsigned int idIdx = hashById(stopId, ht->numBuckets);
    HashNode* curr = ht->idBuckets[idIdx];
    HashNode* prev = NULL;
    while (curr) {
        if (curr->stopId == stopId) {
            if (!prev) {
                ht->idBuckets[idIdx] = curr->next;
            } else {
                prev->next = curr->next;
            }
            free(curr);
            deletedId = 1;
            break;
        }
        prev = curr;
        curr = curr->next;
    }

    /* 2. Delete from Name bucket chain */
    unsigned int nameIdx = hashByName(stopName, ht->numBuckets);
    curr = ht->nameBuckets[nameIdx];
    prev = NULL;
    while (curr) {
        if (hashStrCaseCmp(curr->stopName, stopName) == 0) {
            if (!prev) {
                ht->nameBuckets[nameIdx] = curr->next;
            } else {
                prev->next = curr->next;
            }
            free(curr);
            deletedName = 1;
            break;
        }
        prev = curr;
        curr = curr->next;
    }

    if (deletedId || deletedName) {
        if (ht->count > 0) ht->count--;
        return 1;
    }
    return 0;
}

/**
 * @brief Displays non-empty buckets and collision chains in the Name Hash Table.
 */
void displayHashTable(const HashTable* ht) {
    if (!ht || ht->count == 0) {
        printf("\n[Hash Table] Empty (0 stops indexed).\n");
        return;
    }

    printf("\n--- Separate Chaining Hash Table (Name Buckets: %d) ---\n", ht->numBuckets);
    for (int i = 0; i < ht->numBuckets; i++) {
        if (ht->nameBuckets[i] != NULL) {
            printf("Bucket [%2d]: ", i);
            HashNode* curr = ht->nameBuckets[i];
            while (curr) {
                printf("[ID: %d | %s]", curr->stopId, curr->stopName);
                if (curr->next) printf(" -> ");
                curr = curr->next;
            }
            printf("\n");
        }
    }
    printf("Total Indexed Bus Stops: %d\n", ht->count);
}
