/* tslint:disable:no-unused-variable */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {DebugElement, NO_ERRORS_SCHEMA} from '@angular/core';

import {OwnerListComponent} from './owner-list.component';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import { OwnerService } from '../owner.service';
import {Owner} from '../owner';
import {Observable, of, Subject} from 'rxjs';
import {RouterTestingModule} from '@angular/router/testing';
import {CommonModule} from '@angular/common';
import {PartsModule} from '../../parts/parts.module';
import {ActivatedRouteStub} from '../../testing/router-stubs';
import {OwnerDetailComponent} from '../owner-detail/owner-detail.component';
import {OwnersModule} from '../owners.module';
import {DummyComponent} from '../../testing/dummy.component';
import {OwnerAddComponent} from '../owner-add/owner-add.component';
import {OwnerEditComponent} from '../owner-edit/owner-edit.component';
import Spy = jasmine.Spy;


class OwnerServiceStub {
  getOwners(): Observable<Owner[]> {
    return of();
  }

  searchOwners(lastName: string): Observable<Owner[]> {
    return of();
  }
}

describe('OwnerListComponent', () => {

  let component: OwnerListComponent;
  let fixture: ComponentFixture<OwnerListComponent>;
  let ownerService = new OwnerServiceStub();
  let getOwnersSpy: Spy;
  let searchOwnersSpy: Spy;
  let de: DebugElement;
  let el: HTMLElement;


  const testOwner: Owner = {
    id: 1,
    firstName: 'George',
    lastName: 'Franklin',
    address: '110 W. Liberty St.',
    city: 'Madison',
    telephone: '6085551023',
    pets: []
  };
  let testOwners: Owner[];

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DummyComponent],
      schemas: [NO_ERRORS_SCHEMA],
      imports: [CommonModule, FormsModule, PartsModule, OwnersModule,
        RouterTestingModule.withRoutes(
          [{path: 'owners', component: OwnerListComponent},
            {path: 'owners/add', component: OwnerAddComponent},
            {path: 'owners/:id', component: OwnerDetailComponent},
            {path: 'owners/:id/edit', component: OwnerEditComponent}
          ])],
      providers: [
        {provide: OwnerService, useValue: ownerService},
        {provide: ActivatedRoute, useClass: ActivatedRouteStub}
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    testOwners = [testOwner];

    fixture = TestBed.createComponent(OwnerListComponent);
    component = fixture.componentInstance;
    ownerService = fixture.debugElement.injector.get(OwnerService);
    getOwnersSpy = spyOn(ownerService, 'getOwners')
      .and.returnValue(of(testOwners));
    searchOwnersSpy = spyOn(ownerService, 'searchOwners')
      .and.returnValue(of(testOwners));

  });

  it('should create OwnerListComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should call ngOnInit() method', () => {
    fixture.detectChanges();
    expect(getOwnersSpy.calls.any()).toBe(true, 'getOwners called');
  });


  it(' should show full name after getOwners observable (async) ', waitForAsync(() => {
    fixture.detectChanges();
    fixture.whenStable().then(() => { // wait for async getOwners
      fixture.detectChanges();        // update view with name
      de = fixture.debugElement.query(By.css('.ownerFullName'));
      el = de.nativeElement;
      expect(el.innerText).toBe((testOwner.firstName.toString() + ' ' + testOwner.lastName.toString()));
    });
  }));

  it('searchByLastName should call getOwners for empty term', () => {
    getOwnersSpy.calls.reset();
    searchOwnersSpy.calls.reset();

    component.searchByLastName('');

    expect(getOwnersSpy).toHaveBeenCalled();
    expect(searchOwnersSpy).not.toHaveBeenCalled();
  });

  it('searchByLastName should call searchOwners for non-empty term', () => {
    getOwnersSpy.calls.reset();
    searchOwnersSpy.calls.reset();

    component.searchByLastName('Fr');

    expect(searchOwnersSpy).toHaveBeenCalledWith('Fr');
    expect(getOwnersSpy).not.toHaveBeenCalled();
  });

  // The page loads every owner on open; a search typed before that answer arrives must
  // not be overwritten by it when it finally does.
  it('a search is not overwritten by the initial load answering late', () => {
    const initialLoad = new Subject<Owner[]>();
    getOwnersSpy.and.returnValue(initialLoad);
    fixture.detectChanges();

    component.searchByLastName('Franklin');
    initialLoad.next([testOwner, {...testOwner, id: 2, lastName: 'Davis'}]);

    expect(component.owners).toEqual([testOwner]);
  });

  describe('sorting', () => {
    const davis: Owner = {...testOwner, id: 2, firstName: 'Betty', lastName: 'Davis', city: 'Sun Prairie'};
    const davisHarold: Owner = {...testOwner, id: 3, firstName: 'Harold', lastName: 'davis', city: 'Windsor'};
    const black: Owner = {...testOwner, id: 4, firstName: 'Jeff', lastName: 'Black', city: 'Monona'};

    beforeEach(() => {
      getOwnersSpy.and.returnValue(of([testOwner, davisHarold, black, davis]));
      fixture.detectChanges();
    });

    const ids = () => component.sortedOwners.map(o => o.id);

    it('keeps the server order until a column is chosen', () => {
      expect(ids()).toEqual([1, 3, 4, 2]);
    });

    it('sorts by last name, then first name, ignoring case', () => {
      component.sortBy('name');
      expect(ids()).toEqual([4, 2, 3, 1]);
    });

    it('clicking the same column again reverses the order', () => {
      component.sortBy('name');
      component.sortBy('name');
      expect(ids()).toEqual([1, 3, 2, 4]);
      expect(component.ariaSort('name')).toBe('descending');
    });

    it('a new column starts ascending', () => {
      component.sortBy('name');
      component.sortBy('name');
      component.sortBy('city');
      expect(component.sortAscending).toBe(true);
      expect(ids()).toEqual([1, 4, 2, 3]);
      expect(component.ariaSort('name')).toBe('none');
    });

    it('clicking a header sorts the rendered rows', () => {
      fixture.detectChanges();
      fixture.debugElement.query(By.css('[data-sort="name"]')).nativeElement.click();
      fixture.detectChanges();

      const names = fixture.debugElement.queryAll(By.css('.ownerFullName'))
        .map(cell => cell.nativeElement.innerText);
      expect(names).toEqual(['Jeff Black', 'Betty Davis', 'Harold davis', 'George Franklin']);
    });

    it('the sort survives a new search', () => {
      component.sortBy('name');
      searchOwnersSpy.and.returnValue(of([testOwner, black]));
      component.searchByLastName('x');
      expect(ids()).toEqual([4, 1]);
    });
  });

});
