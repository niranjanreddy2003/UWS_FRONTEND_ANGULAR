import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminTrucksComponent } from './admin-trucks.component';

describe('AdminTrucksComponent', () => {
  let component: AdminTrucksComponent;
  let fixture: ComponentFixture<AdminTrucksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTrucksComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminTrucksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
