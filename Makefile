CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -O2
TARGET = transport_planner
SRCS = main.c graph.c heap.c hashtable.c queue.c fileio.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CC) $(CFLAGS) $(SRCS) -o $(TARGET)

clean:
	rm -f $(TARGET) $(OBJS)
