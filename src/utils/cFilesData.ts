import mainC from '../../main.c?raw';
import graphH from '../../graph.h?raw';
import graphC from '../../graph.c?raw';
import heapH from '../../heap.h?raw';
import heapC from '../../heap.c?raw';
import hashtableH from '../../hashtable.h?raw';
import hashtableC from '../../hashtable.c?raw';
import queueH from '../../queue.h?raw';
import queueC from '../../queue.c?raw';
import fileioH from '../../fileio.h?raw';
import fileioC from '../../fileio.c?raw';
import networkTxt from '../../network.txt?raw';
import makefileTxt from '../../Makefile?raw';
import readmeMd from '../../README.md?raw';

export interface CProjectFile {
  name: string;
  category: 'Header (.h)' | 'Source (.c)' | 'Data / Build';
  description: string;
  content: string;
}

export const C_PROJECT_FILES: CProjectFile[] = [
  {
    name: 'main.c',
    category: 'Source (.c)',
    description: 'Menu-driven user interface, fgets() safe input validation, and module dispatch.',
    content: mainC,
  },
  {
    name: 'graph.h',
    category: 'Header (.h)',
    description: 'Graph, Vertex, AdjListNode, PathNode, and RouteResult structure definitions.',
    content: graphH,
  },
  {
    name: 'graph.c',
    category: 'Source (.c)',
    description: 'Adjacency list operations, BFS minimum-stops, Dijkstra with Min-Heap, and Alternative routes.',
    content: graphC,
  },
  {
    name: 'heap.h',
    category: 'Header (.h)',
    description: 'Custom Binary Min-Heap / Priority Queue interface with O(1) pos[] lookup array.',
    content: heapH,
  },
  {
    name: 'heap.c',
    category: 'Source (.c)',
    description: 'Binary Min-Heap implementation: insert, extractMin, decreaseKey, heapifyUp, heapifyDown.',
    content: heapC,
  },
  {
    name: 'hashtable.h',
    category: 'Header (.h)',
    description: 'Dual-indexed Separate Chaining Hash Table interface for Stop ID and Stop Name.',
    content: hashtableH,
  },
  {
    name: 'hashtable.c',
    category: 'Source (.c)',
    description: 'Separate chaining hash functions, insert, search, delete, and bucket display.',
    content: hashtableC,
  },
  {
    name: 'queue.h',
    category: 'Header (.h)',
    description: 'Linked-list FIFO Queue interface used by Breadth-First Search.',
    content: queueH,
  },
  {
    name: 'queue.c',
    category: 'Source (.c)',
    description: 'FIFO Queue implementation: createQueue, enqueue, dequeue, peekQueue, freeQueue.',
    content: queueC,
  },
  {
    name: 'fileio.h',
    category: 'Header (.h)',
    description: 'Text file persistence and built-in sample transport network loader interface.',
    content: fileioH,
  },
  {
    name: 'fileio.c',
    category: 'Source (.c)',
    description: 'Save and load network.txt and populate the 6-stop, 7-connection sample network.',
    content: fileioC,
  },
  {
    name: 'network.txt',
    category: 'Data / Build',
    description: 'Default serialized public transport network data file.',
    content: networkTxt,
  },
  {
    name: 'Makefile',
    category: 'Data / Build',
    description: 'GCC build configuration for compiling transport_planner.',
    content: makefileTxt,
  },
  {
    name: 'README.md',
    category: 'Data / Build',
    description: 'Project documentation, compilation commands, complexity table, and viva Q&A.',
    content: readmeMd,
  },
];
