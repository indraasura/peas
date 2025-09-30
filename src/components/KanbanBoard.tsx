'use client'

import React from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  Card,
  CardContent,
  CardActions,
  Tooltip
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface KanbanColumn {
  id: string
  title: string
  items: any[]
  color?: string
  showAddButton?: boolean
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  onItemMove: (result: DropResult) => void
  onItemEdit?: (item: any) => void
  onItemDelete?: (item: any) => void
  onItemView?: (item: any) => void
  onItemAdd?: (columnId: string) => void
  renderItem: (item: any) => React.ReactNode
  addButtonText?: string
  showActionButtons?: boolean
}

export default function KanbanBoard({
  columns,
  onItemMove,
  onItemEdit,
  onItemDelete,
  onItemView,
  onItemAdd,
  renderItem,
  addButtonText = 'Add Item',
  showActionButtons = true
}: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    onItemMove(result)
  }

  const handleCardDoubleClick = (item: any) => {
    if (onItemView) {
      onItemView(item)
    }
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', minHeight: '70vh', p: 2 }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        {columns.map((column) => (
          <Paper
            key={column.id}
            sx={{
              minWidth: 300,
              maxWidth: 350,
              height: 'fit-content',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 1,
              // Removed boxShadow for flat design
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                  {column.title}
                </Typography>
                <Chip
                  label={column.items.length}
                  size="small"
                  sx={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}
                />
              </Box>
              {onItemAdd && column.showAddButton && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => onItemAdd(column.id)}
                  sx={{ 
                    mt: 1, 
                    width: '100%',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: '#2563eb',
                    }
                  }}
                  variant="contained"
                  size="small"
                >
                  {addButtonText}
                </Button>
              )}
            </Box>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    minHeight: 200,
                    p: 1,
                    backgroundColor: snapshot.isDraggingOver ? '#f9fafb' : 'transparent',
                    transition: 'background-color 0.2s ease',
                    borderRadius: 1
                  }}
                >
                  {column.items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            mb: 1,
                            opacity: snapshot.isDragging ? 0.8 : 1,
                            transform: snapshot.isDragging ? 'rotate(2deg)' : 'none'
                          }}
                        >
                          <Card
                            onDoubleClick={() => handleCardDoubleClick(item)}
                            sx={{
                              cursor: 'pointer',
                              backgroundColor: '#ffffff',
                              border: '1px solid #e5e7eb',
                              borderRadius: 1,
                              // Removed boxShadow and hover effects for flat design
                              '&:hover': {
                                borderColor: '#3b82f6',
                                backgroundColor: '#f8fafc'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <CardContent sx={{ pb: 1 }}>
                              {renderItem(item)}
                            </CardContent>
                            {showActionButtons && (onItemEdit || onItemDelete || onItemView) && (
                              <CardActions sx={{ pt: 0, pb: 1, px: 2 }}>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  {onItemView && (
                                    <Tooltip title="View Details">
                                      <IconButton size="small" onClick={() => onItemView(item)}>
                                        <ViewIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {onItemEdit && (
                                    <Tooltip title="Edit">
                                      <IconButton size="small" onClick={() => onItemEdit(item)}>
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {onItemDelete && (
                                    <Tooltip title="Delete">
                                      <IconButton size="small" onClick={() => onItemDelete(item)}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>
                              </CardActions>
                            )}
                          </Card>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </Paper>
        ))}
      </DragDropContext>
    </Box>
  )
}