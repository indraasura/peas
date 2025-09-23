'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Avatar,
  AvatarGroup,
  Tooltip,
  Divider,
  Card,
  CardContent,
  CardActions
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Visibility as ViewIcon
} from '@mui/icons-material'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface KanbanColumn {
  id: string
  title: string
  items: any[]
  color?: string
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
}

export default function KanbanBoard({
  columns,
  onItemMove,
  onItemEdit,
  onItemDelete,
  onItemView,
  onItemAdd,
  renderItem,
  addButtonText = 'Add Item'
}: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    onItemMove(result)
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
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              boxShadow: 1
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderBottomColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {column.title}
                </Typography>
                <Chip
                  label={column.items.length}
                  size="small"
                  sx={{ backgroundColor: column.color || '#1976d2', color: 'white' }}
                />
              </Box>
              {onItemAdd && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => onItemAdd(column.id)}
                  sx={{ mt: 1, width: '100%' }}
                  variant="outlined"
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
                    backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
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
                            transform: snapshot.isDragging ? 'rotate(5deg)' : 'none'
                          }}
                        >
                          <Card
                            sx={{
                              cursor: 'pointer',
                              backgroundColor: 'background.paper',
                              border: '1px solid',
                              borderColor: 'divider',
                              '&:hover': {
                                boxShadow: 3,
                                borderColor: 'primary.main'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <CardContent sx={{ pb: 1 }}>
                              {renderItem(item)}
                            </CardContent>
                            {(onItemEdit || onItemDelete || onItemView) && (
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
