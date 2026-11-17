import {Component, OnInit} from '@angular/core';
import {OwnerService} from '../owner.service';
import {Owner} from '../owner';
import {Router} from '@angular/router';
import { finalize } from 'rxjs/operators';
import {Subscription} from 'rxjs';

export type OwnerSortColumn = 'name' | 'address' | 'city' | 'telephone';

const SORT_KEYS: Record<OwnerSortColumn, (owner: Owner) => string[]> = {
  name: owner => [owner.lastName, owner.firstName],
  address: owner => [owner.address],
  city: owner => [owner.city],
  telephone: owner => [owner.telephone],
};

@Component({
  selector: 'app-owner-list',
  templateUrl: './owner-list.component.html',
  styleUrls: ['./owner-list.component.css']
})
export class OwnerListComponent implements OnInit {
  errorMessage: string;
  lastName: string;
  owners: Owner[];
  listOfOwnersWithLastName: Owner[];
  isOwnersDataReceived: boolean = false;
  sortColumn: OwnerSortColumn | null = null;
  sortAscending = true;
  readonly sortableColumns: {key: OwnerSortColumn, label: string}[] = [
    {key: 'name', label: 'Name'},
    {key: 'address', label: 'Address'},
    {key: 'city', label: 'City'},
    {key: 'telephone', label: 'Telephone'},
  ];
  private load: Subscription;

  constructor(private router: Router, private ownerService: OwnerService) {

  }

  ngOnInit() {
    this.load = this.ownerService.getOwners().pipe(
      finalize(() => {
        this.isOwnersDataReceived = true;
      })
    ).subscribe(
      owners => this.owners = owners,
      error => this.errorMessage = error as any);
  }

  // Clicking the sorted column again reverses it; a new column starts ascending.
  sortBy(column: OwnerSortColumn) {
    this.sortAscending = this.sortColumn === column ? !this.sortAscending : true;
    this.sortColumn = column;
  }

  ariaSort(column: OwnerSortColumn): string {
    if (this.sortColumn !== column) {
      return 'none';
    }
    return this.sortAscending ? 'ascending' : 'descending';
  }

  get sortedOwners(): Owner[] {
    if (!this.owners || !this.sortColumn) {
      return this.owners;
    }
    const keyOf = SORT_KEYS[this.sortColumn];
    const direction = this.sortAscending ? 1 : -1;
    return [...this.owners].sort((a, b) => direction * compareKeys(keyOf(a), keyOf(b)));
  }

  onSelect(owner: Owner) {
    this.router.navigate(['/owners', owner.id]);
  }

  addOwner() {
    this.router.navigate(['/owners/add']);
  }

  // Only the latest query may answer: a search sent while the initial load is still in
  // flight would otherwise be overwritten by the full list when it lands afterwards.
  searchByLastName(lastName: string) {
    this.load?.unsubscribe();
    const owners$ = lastName ? this.ownerService.searchOwners(lastName) : this.ownerService.getOwners();
    this.load = owners$.subscribe(
      owners => this.owners = owners,
      () => this.owners = null);
  }
}

function compareKeys(a: string[], b: string[]): number {
  for (let i = 0; i < a.length; i++) {
    const result = (a[i] ?? '').localeCompare(b[i] ?? '', undefined, {sensitivity: 'base', numeric: true});
    if (result !== 0) {
      return result;
    }
  }
  return 0;
}
