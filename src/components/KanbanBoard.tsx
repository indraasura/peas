'use client'

import React from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Eye, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div className="flex gap-4 overflow-x-auto min-h-[70vh] p-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        {columns.map((column) => (
          <Card
            key={column.id}
            className="min-w-[300px] max-w-[350px] h-fit bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <CardHeader className="pb-3 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {column.title}
                </CardTitle>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                  {column.items.length}
                </Badge>
              </div>
              {onItemAdd && column.showAddButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onItemAdd(column.id)}
                  className="w-full mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addButtonText}
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-2">
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[200px] p-1 rounded-md transition-colors",
                      snapshot.isDraggingOver ? "bg-gray-50" : "bg-transparent"
                    )}
                  >
                    {column.items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "mb-2 transition-all duration-200",
                              snapshot.isDragging ? "opacity-80 rotate-1" : "opacity-100"
                            )}
                          >
                            <Card
                              onDoubleClick={() => handleCardDoubleClick(item)}
                              className={cn(
                                "cursor-pointer bg-white border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200",
                                "hover:shadow-lg"
                              )}
                            >
                              <CardContent className="p-3">
                                {renderItem(item)}
                              </CardContent>
                              {showActionButtons && (onItemEdit || onItemDelete || onItemView) && (
                                <div className="flex gap-1 p-2 pt-0">
                                  {onItemView && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onItemView(item)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {onItemEdit && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onItemEdit(item)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {onItemDelete && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onItemDelete(item)}
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        ))}
      </DragDropContext>
    </div>
  )
}