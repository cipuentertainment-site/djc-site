"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Save, Trash2 } from "lucide-react";

import {
  deleteMerchandiseProductAction,
  deletePortfolioItemAction,
  saveMerchandiseProductAction,
  savePortfolioItemAction,
  updateMerchandiseRequestStatusAction,
  type AdminActionResult,
} from "@/app/admin/actions";
import { ResultMessage } from "@/components/admin/result-message";
import { ServiceImageUploader } from "@/components/admin/service-image-uploader";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";
import {
  merchandiseImagesBucket,
  portfolioImagesBucket,
} from "@/lib/supabase/storage";
import type { AdminMerchandiseMediaData } from "@/types/admin-data";
import type {
  MerchandiseProduct,
  MerchandiseRequest,
  MerchandiseRequestStatus,
  PortfolioItem,
} from "@/types/merchandise-media";
import { cn } from "@/lib/utils";

type MerchandiseMediaManagerProps = {
  data: AdminMerchandiseMediaData;
};

const requestStatuses: MerchandiseRequestStatus[] = [
  "new",
  "read",
  "contacted",
  "completed",
];

export function MerchandiseMediaManager({ data }: MerchandiseMediaManagerProps) {
  return (
    <Tabs defaultValue="merchandise" className="space-y-4">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="merchandise">Merchandise</TabsTrigger>
        <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        <TabsTrigger value="requests">Requests</TabsTrigger>
      </TabsList>

      <TabsContent value="merchandise" className="space-y-4">
        <MerchandiseProductForm
          nextSortOrder={(data.merchandiseProducts.length + 1) * 10}
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {data.merchandiseProducts.map((product) => (
            <MerchandiseProductForm key={product.id} product={product} />
          ))}
        </div>
        {!data.merchandiseProducts.length ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            No merchandise configured yet.
          </p>
        ) : null}
      </TabsContent>

      <TabsContent value="portfolio" className="space-y-4">
        <PortfolioItemForm nextSortOrder={(data.portfolioItems.length + 1) * 10} />
        <div className="grid gap-4 xl:grid-cols-2">
          {data.portfolioItems.map((item) => (
            <PortfolioItemForm key={item.id} item={item} />
          ))}
        </div>
        {!data.portfolioItems.length ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            No portfolio items configured yet.
          </p>
        ) : null}
      </TabsContent>

      <TabsContent value="requests">
        <MerchandiseRequestsTable requests={data.merchandiseRequests} />
      </TabsContent>
    </Tabs>
  );
}

function PortfolioItemForm({
  item,
  nextSortOrder = 10,
}: {
  item?: PortfolioItem;
  nextSortOrder?: number;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [thumbnailPath, setThumbnailPath] = useState(item?.thumbnail_path ?? "");
  const [externalUrl, setExternalUrl] = useState(item?.external_url ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sort_order ?? nextSortOrder));
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [result, setResult] = useState<AdminActionResult>();
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const actionResult = await savePortfolioItemAction({
          id: item?.id,
          title,
          description: item?.description ?? "",
          thumbnailPath,
          externalUrl,
          sortOrder: Number(sortOrder),
          isActive,
        });

      setResult(actionResult);

      if (actionResult.ok && !item) {
        setTitle("");
        setThumbnailPath("");
        setExternalUrl("");
        setSortOrder(String(nextSortOrder));
        setIsActive(true);
      }
    });
  }

  function remove() {
    if (!item || !window.confirm("Delete this portfolio item?")) {
      return;
    }

    startTransition(async () => {
      setResult(await deletePortfolioItemAction(item.id));
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{item ? "Edit portfolio item" : "Create portfolio item"}</CardTitle>
            <CardDescription>Carousel image plus the link opened by the play button.</CardDescription>
          </div>
          {item ? <StatusBadge status={isActive ? "active" : "inactive"} /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="External URL" value={externalUrl} onChange={setExternalUrl} />
          <Field
            label="Display order"
            type="number"
            value={sortOrder}
            onChange={setSortOrder}
          />
          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>
        </div>
        <div className="space-y-2">
          <Label>Thumbnail</Label>
          <ServiceImageUploader
            value={thumbnailPath}
            onChange={setThumbnailPath}
            serviceId={item?.id}
            bucket={portfolioImagesBucket}
          />
        </div>
        <ResultMessage result={result} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save"}
          </Button>
          {item ? (
            <>
              <Button asChild variant="outline">
                <a href={item.external_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
              </Button>
              <Button variant="destructive" onClick={remove} disabled={isPending}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MerchandiseProductForm({
  product,
  nextSortOrder = 10,
}: {
  product?: MerchandiseProduct;
  nextSortOrder?: number;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [priceAmount, setPriceAmount] = useState(String(product?.price_amount ?? 0));
  const [currency, setCurrency] = useState(product?.currency ?? "KES");
  const [imagePath, setImagePath] = useState(product?.image_path ?? "");
  const [colours, setColours] = useState(product?.available_colours.join(", ") ?? "");
  const [colourImagePaths, setColourImagePaths] = useState<Record<string, string>>(() => {
    const entries =
      product?.images?.map((image) => [image.colour, image.image_path] as const) ?? [];

    return Object.fromEntries(entries);
  });
  const [sortOrder, setSortOrder] = useState(String(product?.sort_order ?? nextSortOrder));
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [result, setResult] = useState<AdminActionResult>();
  const [isPending, startTransition] = useTransition();
  const availableColours = useMemo(
    () =>
      Array.from(
        new Set(
          colours
            .split(/[\n,]/)
            .map((colour) => colour.trim())
            .filter(Boolean),
        ),
      ),
    [colours],
  );

  function save() {
    startTransition(async () => {
      const actionResult = await saveMerchandiseProductAction({
          id: product?.id,
          name,
          description,
          priceAmount: Number(priceAmount),
          currency,
          imagePath,
          availableColours,
          images: availableColours.map((colour) => ({
            colour,
            imagePath: colourImagePaths[colour] ?? "",
          })),
          sortOrder: Number(sortOrder),
          isActive,
        });

      setResult(actionResult);

      if (actionResult.ok && !product) {
        setName("");
        setDescription("");
        setPriceAmount("0");
        setCurrency("KES");
        setImagePath("");
        setColours("");
        setColourImagePaths({});
        setSortOrder(String(nextSortOrder));
        setIsActive(true);
      }
    });
  }

  function remove() {
    if (!product || !window.confirm("Delete this merchandise product?")) {
      return;
    }

    startTransition(async () => {
      setResult(await deleteMerchandiseProductAction(product.id));
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{product ? "Edit merchandise" : "Create merchandise"}</CardTitle>
            <CardDescription>Simple product catalogue item for manual requests.</CardDescription>
          </div>
          {product ? <StatusBadge status={isActive ? "active" : "inactive"} /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Product name" value={name} onChange={setName} />
          <Field
            label="Price"
            type="number"
            value={priceAmount}
            onChange={setPriceAmount}
          />
          <Field label="Currency" value={currency} onChange={setCurrency} />
          <Field
            label="Display order"
            type="number"
            value={sortOrder}
            onChange={setSortOrder}
          />
          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Available colours</Label>
          <Textarea
            value={colours}
            onChange={(event) => setColours(event.target.value)}
            placeholder="Black, White, Red"
          />
        </div>
        <div className="space-y-2">
          <Label>Product image</Label>
          <p className="text-xs text-muted-foreground">
            Used in listings and as a fallback when a colour image is not set.
          </p>
          <ServiceImageUploader
            value={imagePath}
            onChange={setImagePath}
            serviceId={product?.id}
            bucket={merchandiseImagesBucket}
          />
        </div>
        {availableColours.length ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div>
              <Label>Colour images</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Add one image per colour so the customer sees the selected item.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {availableColours.map((colour) => (
                <div key={colour} className="space-y-2 rounded-md border bg-card p-3">
                  <Label>{colour}</Label>
                  <ServiceImageUploader
                    value={colourImagePaths[colour] ?? ""}
                    onChange={(path) =>
                      setColourImagePaths((current) => ({
                        ...current,
                        [colour]: path,
                      }))
                    }
                    serviceId={product?.id}
                    bucket={merchandiseImagesBucket}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <ResultMessage result={result} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save"}
          </Button>
          {product ? (
            <Button variant="destructive" onClick={remove} disabled={isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MerchandiseRequestsTable({ requests }: { requests: MerchandiseRequest[] }) {
  if (!requests.length) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        No merchandise requests yet.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Merchandise requests</CardTitle>
        <CardDescription>Newest requests appear first.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow
                key={request.id}
                className={cn(request.status === "new" && "bg-secondary/15")}
              >
                <TableCell>
                  <div className="font-medium">{request.product_name_snapshot}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatMoney(
                      request.product_price_amount_snapshot,
                      request.currency,
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{request.customer_name}</div>
                  <a
                    href={`https://wa.me/${request.customer_phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {request.customer_phone}
                  </a>
                </TableCell>
                <TableCell className="text-sm">
                  <div>Qty {request.quantity}</div>
                  <div className="text-xs text-muted-foreground">
                    {request.selected_colour ?? "No colour selected"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleString("en-KE")}
                  </div>
                </TableCell>
                <TableCell>
                  <RequestStatusControl request={request} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RequestStatusControl({ request }: { request: MerchandiseRequest }) {
  const [status, setStatus] = useState<MerchandiseRequestStatus>(request.status);
  const [result, setResult] = useState<AdminActionResult>();
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      setResult(await updateMerchandiseRequestStatusAction(request.id, status));
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as MerchandiseRequestStatus)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {requestStatuses.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={save}
          disabled={isPending || status === request.status}
        >
          Save
        </Button>
      </div>
      <ResultMessage result={result} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
