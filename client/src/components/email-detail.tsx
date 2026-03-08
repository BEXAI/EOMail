import { useState } from "react";
import DOMPurify from "dompurify";
import { type Email } from "@shared/schema";
import { getInitials, getSenderColor, cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  Reply,
  MoreVertical,
  Paperclip,
  ChevronDown,
  FolderInput,
  Inbox,
  AlertTriangle,
  Mail,
  MailOpen,
  Sparkles,
  Brain,
  Shield,
  ShieldAlert,
  Check,
  Pencil,
  X,
  Loader2,
  Zap,
  DollarSign,
  Calendar,
  Newspaper,
  Clock,
  FileText,
} from "lucide-react";
import { LiquidUICard } from "@/components/liquid-ui-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
