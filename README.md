# Smart Public Transport Route Planner Using Graph Algorithms in C

## 1. Project Description
**Smart Public Transport Route Planner** is a modular, menu-driven console application written in standard ISO C99 (`stdio.h`, `stdlib.h`, `string.h`, `ctype.h`) for an **Advanced Data Structures Project-Based Learning (PBL)** evaluation.

The application models an urban public bus network as a **weighted undirected graph** and computes:
1. **Shortest-Distance Route** using **Dijkstra’s Algorithm** backed by a custom **Binary Min-Heap (Priority Queue)** with an $O(1)$ position-tracking array (`pos[]`).
2. **Minimum-Stops Route** using **Breadth-First Search (BFS)** backed by a custom **Linked-List FIFO Queue**.
3. **Alternative Routes** using a simplified **Edge-Removal Dijkstra + Bounded DFS Path Enumeration** technique without duplicate paths.
4. **$O(1)$ Average-Time Bus Stop Lookup** by either **Stop ID** or **Stop Name** using a custom **Separate Chaining Hash Table**.
5. **Network Persistence** to and from a human-readable text file (`network.txt`).

---

## 2. File Structure
```text
├── main.c          # Menu-driven console UI, safe input validation, module dispatch
├── graph.h         # Graph, Vertex, AdjListNode, PathNode, RouteResult declarations
├── graph.c         # Adjacency list operations, BFS, Dijkstra, alternative routes
├── heap.h          # Binary Min-Heap / Priority Queue declarations
├── heap.c          # Custom Min-Heap (insert, extractMin, decreaseKey, heapifyUp/Down)
├── hashtable.h     # Separate Chaining Hash Table declarations
├── hashtable.c     # Dual-indexed (ID + Name) Separate Chaining Hash Table
├── queue.h         # Linked-list FIFO Queue declarations
├── queue.c         # Enqueue, Dequeue, Peek, and memory cleanup for BFS
├── fileio.h        # File persistence and built-in sample network declarations
├── fileio.c        # Save/load network.txt and loadBuiltInSampleNetwork()
├── network.txt     # Pre-populated sample public transport network file
├── Makefile        # Standard GCC build file
└── README.md       # Complete project documentation, complexity analysis, and viva Q&A
```

---

## 3. Compilation and Execution Instructions

### Using GCC Directly
```bash
gcc *.c -o transport_planner
./transport_planner
```

### With Strict Compiler Warnings Enabled
```bash
gcc -Wall -Wextra -std=c99 main.c graph.c heap.c hashtable.c queue.c fileio.c -o transport_planner
./transport_planner
```

---

## 4. Built-in Sample Network
When the program starts, it automatically loads the following 6 bus stops and 7 undirected connections:

| Stop ID | Stop Name | Direct Connections (Distance in km) |
| :---: | :--- | :--- |
| **1** | College | Library (3 km), Market (5 km) |
| **2** | Library | College (3 km), Hospital (4 km) |
| **3** | Market | College (5 km), Railway Station (2 km) |
| **4** | Hospital | Library (4 km), City Center (6 km), Railway Station (5 km) |
| **5** | Railway Station | Market (2 km), City Center (3 km), Hospital (5 km) |
| **6** | City Center | Hospital (6 km), Railway Station (3 km) |

### Key Routes from `College (1)` to `City Center (6)` on Sample Network:
- **Shortest-Distance Route (Dijkstra)**:
  `College -> Market -> Railway Station -> City Center`
  - **Total Stops**: `4` | **Transfers**: `2` | **Estimated Distance**: `10 km` ($5 + 2 + 3$) | **Estimated Time**: `24 minutes` at $25\text{ km/h}$.
- **Minimum-Stops Route (BFS)**:
  `College -> Library -> Hospital -> City Center`
  - **Total Stops**: `4` | **Transfers**: `2` | **Estimated Distance**: `13 km` ($3 + 4 + 6$) | **Estimated Time**: `31 minutes` at $25\text{ km/h}$.
- **Alternative Routes**:
  1. *Primary Shortest*: `College -> Market -> Railway Station -> City Center` (`10 km`, `24 minutes`)
  2. *Alternative Route 1*: `College -> Library -> Hospital -> City Center` (`13 km`, `31 minutes`)
  3. *Alternative Route 2*: `College -> Library -> Hospital -> Railway Station -> City Center` (`15 km`, `36 minutes`)
  4. *Alternative Route 3*: `College -> Market -> Railway Station -> Hospital -> City Center` (`18 km`, `43 minutes`)

---

## 5. Data-Structure & Algorithm Explanations

### 5.1 Graph Representation Using Adjacency List
- Each bus stop is a `Vertex` entry in a dynamic array `graph->vertices[]`.
- Every `Vertex` holds a head pointer (`AdjListNode* head`) to a **singly linked list** of adjacent stops.
- Because the network is **undirected**, adding a bus connection between stop $u$ and stop $v$ with distance $w$ inserts $v$ into $u$'s adjacency list and $u$ into $v$'s adjacency list.
- Space usage is $O(V + E)$, which is far more memory-efficient for sparse real-world transit networks than an $O(V^2)$ adjacency matrix.

### 5.2 Breadth-First Search (BFS) with Custom FIFO Queue
- BFS explores bus stops layer-by-layer in order of increasing number of hops (edges) from the source stop.
- Because every hop represents one bus leg, the **first time** the destination vertex is dequeued from our custom linked-list FIFO `Queue`, the path reconstructed via `parent[]` pointers is guaranteed to have the **minimum number of stops**.

### 5.3 Dijkstra’s Algorithm with Custom Binary Min-Heap
- Maintains tentative shortest distances `dist[]` initialized to $\infty$ (`INF_DISTANCE`), with `dist[src] = 0`.
- All active vertices are inserted into the custom `MinHeap`.
- At each step, `extractMin()` removes the unvisited stop $u$ with the smallest `dist[u]` in $O(\log V)$ time.
- For every neighbor $v$ of $u$, if `dist[u] + weight(u, v) < dist[v]`, we update `dist[v]`, set `parent[v] = u`, and call `decreaseKey(minHeap, v, dist[v])` which uses `minHeap->pos[v]` to locate $v$ in $O(1)$ time and bubble it up in $O(\log V)$ time.

### 5.4 Custom Hash Table with Separate Chaining
- Uses `HASH_TABLE_SIZE = 31` (a prime number) and maintains two bucket arrays: `idBuckets[]` (multiplicative hash on `stopId`) and `nameBuckets[]` (polynomial rolling hash with multiplier $31$ on lowercase characters).
- Collisions are resolved via **separate chaining**: each bucket points to a singly linked list of `HashNode` structs.

### 5.5 Where Linked Lists Are Used
1. **Graph Adjacency Lists (`AdjListNode`)**: Stores all outgoing bus connections for each vertex.
2. **Route Reconstruction List (`PathNode`)**: Stores the ordered sequence of stops in a computed `RouteResult` (`buildRouteLinkedList` and `freeRouteLinkedList`).
3. **Hash Table Collision Chains (`HashNode`)**: Resolves hash collisions in each bucket via separate chaining.
4. **BFS Queue (`QueueNode`)**: Implements the dynamic FIFO queue with $O(1)$ `enqueue` and `dequeue`.

---

## 6. Time and Space Complexity Analysis

Let $V$ be the number of bus stops (vertices) and $E$ be the number of undirected connections (edges).

| Operation | Time Complexity | Space Complexity | Explanation |
| :--- | :---: | :---: | :--- |
| **Add a Bus Stop** | $O(V)$ | $O(1)$ | Checks duplicate stop and claims free slot; $O(1)$ hash insert |
| **Search Bus Stop (Hash Table)** | $O(1)$ avg, $O(V)$ worst | $O(V)$ | Direct bucket lookup via separate chaining |
| **Add a Bus Route (Edge)** | $O(\deg(u) + \deg(v)) = O(V)$ | $O(1)$ | Traverses neighbor lists of endpoints to prevent duplicate edges |
| **BFS Minimum-Stops Search** | $O(V + E)$ | $O(V)$ | Visits each vertex and edge at most once using FIFO Queue |
| **Dijkstra Shortest-Distance** | $O((V + E) \log V)$ | $O(V)$ | $V$ `extractMin` and at most $2E$ `decreaseKey` operations on Min-Heap |
| **Display Transport Network** | $O(V + E)$ | $O(1)$ | Iterates over all active stops and their adjacency lists |
| **Save / Load Network File** | $O(V + E)$ | $O(V + E)$ | Serializes or parses every stop and connection sequentially |
